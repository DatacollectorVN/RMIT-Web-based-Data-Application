package main

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductDocument struct {
	ProductID   string    `json:"product_id"`
	Brand       string    `json:"brand"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Price       float64   `json:"price"`
	ItemVector  []float32 `json:"item_vector"`
	LastUpdated time.Time `json:"updated_at"`
}

func placeholderUnitVector384(seedText string) []float32 {
	const dim = 384
	vec := make([]float32, 0, dim)

	// Expand sha256(seedText || counter) until we have dim floats.
	counter := 0
	for len(vec) < dim {
		h := sha256.Sum256([]byte(fmt.Sprintf("%s|%d", seedText, counter)))
		counter++
		for i := 0; i < len(h) && len(vec) < dim; i++ {
			// Map byte to [-1, 1] and avoid a guaranteed all-zero vector.
			f := (float32(h[i]) / 255.0 * 2.0) - 1.0
			vec = append(vec, f)
		}
	}

	// Normalize to unit length for cosine similarity.
	var sum float64
	for _, v := range vec {
		sum += float64(v * v)
	}
	norm := math.Sqrt(sum)
	if norm == 0 {
		// Extremely unlikely, but ensure non-zero.
		vec[0] = 1
		norm = 1
	}
	inv := float32(1.0 / norm)
	for i := range vec {
		vec[i] *= inv
	}
	return vec
}

func main() {
	ctx := context.Background()

	dbURL := os.Getenv("DATABASE_URL")
	osURL := os.Getenv("OPENSEARCH_URL")
	index := os.Getenv("OPENSEARCH_INDEX_PRODUCTS")
	if index == "" {
		index = "products"
	}

	if dbURL == "" || osURL == "" {
		fmt.Println("reindex summary: indexed=0 failed=0 skipped=1")
		fmt.Println("reason: DATABASE_URL or OPENSEARCH_URL is missing")
		os.Exit(1)
	}

	baseURL, err := url.Parse(osURL)
	if err != nil || baseURL.Scheme == "" || baseURL.Host == "" {
		fmt.Println("reindex summary: indexed=0 failed=1 skipped=0")
		fmt.Printf("reason: invalid OPENSEARCH_URL: %q\n", osURL)
		os.Exit(1)
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12},
		},
	}

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		fmt.Println("reindex summary: indexed=0 failed=1 skipped=0")
		fmt.Printf("reason: failed to connect postgres: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	rows, err := pool.Query(ctx, `
		SELECT id, brand, name, description, category, price::text, updated_at
		FROM products
		ORDER BY updated_at DESC
	`)
	if err != nil {
		fmt.Println("reindex summary: indexed=0 failed=1 skipped=0")
		fmt.Printf("reason: failed to query products: %v\n", err)
		os.Exit(1)
	}
	defer rows.Close()

	type rowProduct struct {
		id          string
		brand       string
		name        string
		description string
		category    string
		priceText   string
		updatedAt   time.Time
	}

	products := make([]rowProduct, 0, 256)
	for rows.Next() {
		var p rowProduct
		if scanErr := rows.Scan(&p.id, &p.brand, &p.name, &p.description, &p.category, &p.priceText, &p.updatedAt); scanErr != nil {
			fmt.Println("reindex summary: indexed=0 failed=1 skipped=0")
			fmt.Printf("reason: scan error: %v\n", scanErr)
			os.Exit(1)
		}
		products = append(products, p)
	}
	if rows.Err() != nil {
		fmt.Println("reindex summary: indexed=0 failed=1 skipped=0")
		fmt.Printf("reason: rows error: %v\n", rows.Err())
		os.Exit(1)
	}

	if len(products) == 0 {
		fmt.Printf("target index: %s\n", index)
		fmt.Println("reindex summary: indexed=0 failed=0 skipped=0")
		fmt.Println("note: no products found in PostgreSQL")
		return
	}

	// Build NDJSON payload for _bulk.
	var ndjson strings.Builder
	indexed := 0
	failed := 0
	for _, p := range products {
		price, parseErr := strconv.ParseFloat(p.priceText, 64)
		if parseErr != nil {
			failed++
			continue
		}

		doc := ProductDocument{
			ProductID:   p.id,
			Brand:       p.brand,
			Name:        p.name,
			Description: p.description,
			Category:    p.category,
			Price:       price,
			// Embeddings are not wired yet; use deterministic non-zero unit vectors (cosine requires non-zero).
			ItemVector:  placeholderUnitVector384(p.brand + " " + p.name + " " + p.description + " " + p.category),
			LastUpdated: p.updatedAt.UTC(),
		}

		meta := map[string]any{"index": map[string]any{"_index": index, "_id": p.id}}
		metaLine, _ := json.Marshal(meta)
		docLine, _ := json.Marshal(doc)

		ndjson.Write(metaLine)
		ndjson.WriteByte('\n')
		ndjson.Write(docLine)
		ndjson.WriteByte('\n')
		indexed++
	}

	bulkURL := *baseURL
	bulkURL.Path = strings.TrimSuffix(bulkURL.Path, "/") + "/_bulk"
	q := bulkURL.Query()
	q.Set("refresh", "true")
	bulkURL.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, bulkURL.String(), strings.NewReader(ndjson.String()))
	if err != nil {
		fmt.Println("reindex summary: indexed=0 failed=1 skipped=0")
		fmt.Printf("reason: failed to build bulk request: %v\n", err)
		os.Exit(1)
	}
	req.Header.Set("Content-Type", "application/x-ndjson")

	// Optional: Basic auth if OPENSEARCH_USERNAME/PASSWORD are provided.
	if u := os.Getenv("OPENSEARCH_USERNAME"); u != "" {
		req.SetBasicAuth(u, os.Getenv("OPENSEARCH_PASSWORD"))
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("target index: %s\n", index)
		fmt.Printf("reindex summary: indexed=%d failed=%d skipped=0\n", 0, indexed+failed)
		fmt.Printf("reason: bulk request failed: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		fmt.Printf("target index: %s\n", index)
		fmt.Printf("reindex summary: indexed=%d failed=%d skipped=0\n", 0, indexed+failed)
		fmt.Printf("reason: bulk request returned HTTP %d\n", resp.StatusCode)
		fmt.Printf("response: %s\n", string(body))
		os.Exit(1)
	}

	if strings.Contains(string(body), `"errors":true`) {
		fmt.Printf("target index: %s\n", index)
		fmt.Printf("reindex summary: indexed=%d failed=%d skipped=0\n", indexed, failed)
		fmt.Printf("note: bulk response contains errors=true (inspect response)\n")
		fmt.Printf("response: %s\n", string(body))
		os.Exit(1)
	}

	fmt.Printf("target index: %s\n", index)
	fmt.Printf("reindex summary: indexed=%d failed=%d skipped=0\n", indexed, failed)
}
