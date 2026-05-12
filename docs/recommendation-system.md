# Product Recommendation System

## Overview

The "You might also love" section on every product detail page is powered by a two-stage recommendation pipeline:

1. **Semantic similarity search** — KNN vector search in OpenSearch using sentence-transformer embeddings
2. **Buyer-profile re-ranking** — demographic scoring applied on top of similarity scores for logged-in users

---

## Architecture

```
User opens product detail page
        │
        ▼
GET /api/v1/recommendations/similar/{product_id}?limit=4[&user_id=X]
        │
        ├─── Anonymous user ──────────────────────────────────────────┐
        │    KNN search → top 4 by cosine similarity                  │
        │                                                             │
        └─── Logged-in user ──────────────────────────────────────────┤
             KNN search → top 50 candidates                           │
             SQL: compute buyer demographics per candidate product     │
             Blend: final = 0.7 × product_score + 0.3 × profile_score │
             Re-rank → top 4                                          │
                                                                      ▼
                                              [{product, similarity_score}]
```

---

## Stage 1 — Semantic Embeddings

### Model

| Property | Value |
|----------|-------|
| Model | `all-MiniLM-L6-v2` (sentence-transformers) |
| Dimensions | **385** (384 text + 1 price) |
| Normalisation | Unit vector (re-normalised after appending price) |
| Similarity metric | Cosine similarity (= dot product for unit vectors) |

### What gets embedded — hybrid vector

Each product is encoded into a **385-dim hybrid unit vector**:

```
dims 0–383  →  all-MiniLM-L6-v2( "{brand} {name} {category}" )      (384-dim, semantic text)
dim  384    →  clamp(price / max_price, 0, 1) × 0.3                  (1-dim, numeric price)
              └─ then the full 385-dim vector is re-normalised to unit length
```

**Why not embed price as raw text?**
`all-MiniLM-L6-v2` is trained on human language — the token `"6.42"` and `"6.43"` are completely unrelated to the model. Appending a normalised numeric dimension gives price a mathematically correct contribution to cosine similarity.

**Price influence:**
With `PRICE_WEIGHT = 0.3`, the price dimension contributes approximately:

```
0.3² / (1² + 0.3²) ≈ 8%  of the cosine similarity signal
```

This means brand + name + category drive 92% of the recommendation, with price providing an 8% nudge toward similarly priced products.

**Price normalisation:**
```
price_feature = clamp(price / max_price, 0, 1) × 0.3
```

`max_price` is read **dynamically from `MAX(price)` in the PostgreSQL `products` table** on first encode call and cached for the process lifetime. This means normalisation automatically adapts to the actual price range in the database — no hardcoded ceiling needed. The fallback value (`35.51`, the current dataset maximum) is used if the DB is unreachable at startup.

### Where vectors are stored

Vectors are stored in **OpenSearch** (not PostgreSQL) under the `item_vector` field of each product document:

```json
{
  "product_id": 42,
  "brand": "Herbal Essences",
  "name": "Argan Oil Shampoo ...",
  "category": "haircare",
  "price": 6.42,
  "item_vector": [0.023, -0.041, 0.017, "...383 more floats..."]
}
```

The index uses an HNSW graph (`nmslib` engine) with cosine similarity:

```json
{
  "type": "knn_vector",
  "dimension": 385,
  "method": {
    "name": "hnsw",
    "space_type": "cosinesimil",
    "engine": "nmslib"
  }
}
```

### Populating vectors

Run the reindex script after every fresh deployment:

```bash
make -C app reindexproducts
```

This will:
1. Drop and recreate the OpenSearch index with the correct KNN mapping
2. Load the sentence-transformer model (~30s on first run)
3. Encode every product from PostgreSQL into a 385-dim hybrid vector
4. Bulk-upload all documents to OpenSearch

New or updated products written through the API are automatically re-encoded and upserted to OpenSearch via `product_index.upsert()`.

---

## Stage 2 — KNN Search

When a user opens a product page, the API:

1. Fetches the current product's `item_vector` from OpenSearch
2. Runs a KNN query to find the nearest neighbours

```
Anonymous  → k = 4  (return top 4 directly)
Logged-in  → k = 50 (fetch candidates for re-ranking)
```

The KNN score returned by OpenSearch is a cosine similarity value in `(0, 1]` — a score of `1.0` means identical vectors.

---

## Stage 3 — Buyer-Profile Re-ranking (Logged-in Only)

For logged-in users the top-50 KNN candidates are re-ranked using demographic data derived from the product's actual buyer history.

### Buyer demographics query

For each candidate product, the system queries who has reviewed it and computes:

| Metric | SQL Aggregate | Meaning |
|--------|--------------|---------|
| `median_age` | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age)` | Median age of buyers |
| `top_location` | `MODE() WITHIN GROUP (ORDER BY location)` | Most frequent buyer location |
| `top_job` | `MODE() WITHIN GROUP (ORDER BY job)` | Most frequent buyer job title |

Only reviewers with all three fields populated (`age`, `location`, `job`) are included.

### Profile score

The current user is compared against each product's typical buyer profile across three dimensions:

| Dimension | Scoring logic | Weight |
|-----------|--------------|--------|
| **Age** | `max(0, 1 − |user.age − median_age| / 50)` — full score if same age, zero if 50+ years apart | Equal weight |
| **Location** | `1.0` if exact match (case-insensitive), `0.0` otherwise | Equal weight |
| **Job** | `1.0` if any word in user's job overlaps with top buyer job, `0.0` otherwise | Equal weight |

The profile score is the average of whichever dimensions are available. If a product has no buyer data, a neutral score of `0.5` is used.

### Final blended score

```
final_score = 0.7 × knn_score + 0.3 × profile_score
```

Products are then sorted descending by `final_score` and the top 4 are returned.

---

## API

### Endpoint

```
GET /api/v1/recommendations/similar/{product_id}
```

### Query parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | `4` | Number of recommendations to return |
| `user_id` | int | — | If provided, enables buyer-profile re-ranking |

### Response

```json
{
  "data": [
    {
      "product": {
        "id": 7,
        "brand": "Herbal Essences",
        "name": "Argan Oil Shampoo & Conditioner",
        "price": 9.04,
        "category": "haircare",
        "avg_rating": 4.3,
        "review_count": 120,
        "photos": [...]
      },
      "similarity": 0.9241
    }
  ]
}
```

The `similarity` field is the final blended score (or raw KNN score for anonymous users), rounded to 4 decimal places.

---

## Fallback

If OpenSearch is unreachable, the system falls back to returning other products from the same brand (fetched from PostgreSQL), with `similarity: 0.0`.

---

## Key Files

| File | Role |
|------|------|
| `app/opensearch/embeddings.py` | Lazy-loaded `SentenceTransformer` singleton + dynamic `max_price` from DB; `encode_product_text()` produces 385-dim hybrid vector |
| `app/opensearch/product_index.py` | `upsert()` / `delete()` — keeps OpenSearch in sync with Postgres writes |
| `app/scripts/reindex_products.py` | Bulk reindex script; creates KNN index mapping if needed |
| `app/services/recommendation_service.py` | Full recommendation pipeline (KNN + profile re-ranking) |
| `app/routers/recommendations.py` | REST endpoint `/api/v1/recommendations/similar/{id}` |
| `ui/src/api.ts` | `fetchSimilarProducts()` — calls the API, falls back to brand filter |
| `ui/src/components/ProductDetailPage.tsx` | "You might also love" section; passes `user_id` when logged in |
