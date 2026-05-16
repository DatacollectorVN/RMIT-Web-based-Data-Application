# Technical Overview — RMIT Beauty App

> **Version:** 1.0.0 · **Date:** 2026-05-15 · **Stack:** FastAPI + PostgreSQL + OpenSearch + React

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Solution Architecture Diagram](#2-solution-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Repository Layout](#4-repository-layout)
5. [Backend Layering](#5-backend-layering)
6. [Database Schema](#6-database-schema)
7. [OpenSearch Integration](#7-opensearch-integration)
8. [API Reference](#8-api-reference)
   - 8.1 [GET /products/search — OpenSearch Name Search](#81-get-productssearch--opensearch-name-search)
   - 8.2 [GET /recommendations/similar/{product_id} — KNN + Profile Re-ranking](#82-get-recommendationssimilarproduct_id--knn--profile-re-ranking)
   - 8.3 [POST /ai/counting-predict — Random Forest Classification](#83-post-aicounting-predict--random-forest-classification)
   - 8.4 [POST /ai/semantic-predict — Semantic Classification](#84-post-aisemantic-predict--semantic-classification)
   - 8.5 [POST /ai/human-confirm — Human Verdict](#85-post-aihuman-confirm--human-verdict)
9. [AI Inference Pipelines](#9-ai-inference-pipelines)
10. [Review Lifecycle State Machine](#10-review-lifecycle-state-machine)
11. [Deployment](#11-deployment)
12. [Environment Configuration](#12-environment-configuration)

---

## 1. Project Overview

**GlowShop** is a full-stack beauty e-commerce platform with two primary capabilities:

| Capability | Description |
|---|---|
| **Product Catalogue & Search** | Full-text and semantic product search backed by OpenSearch |
| **AI Review Classification** | Two ML classifiers (Random Forest + semantic models) that label reviews as *genuine buyer* or *not a buyer*, with a human-review confirmation stage |

The system exposes a single FastAPI REST API consumed by a React 18 SPA frontend and is fully containerised with Docker Compose.

---

## 2. Solution Architecture Diagram

```mermaid
graph TB
    subgraph Browser["Browser / GlowShop UI (React 18 + TypeScript)"]
        UI[React SPA<br/>Vite · Tailwind · Recharts]
    end

    subgraph DockerCompose["Docker Compose Stack"]
        subgraph Nginx["rmit-ui · Nginx :3000"]
            NGINX[Static SPA]
        end

        subgraph App["rmit-app · FastAPI :8080"]
            direction TB
            MW[CORS Middleware]
            R_PROD[/products router/]
            R_REC[/recommendations router/]
            R_AI[/ai router/]
            R_REVIEW[/reviews router/]
            R_USER[/users router/]
            R_ORDER[/orders router/]
            R_AUTH[/auth router/]
            R_DASH[/dashboard router/]
            R_HEALTH[/health router/]

            SVC_SEARCH[search_service]
            SVC_REC[recommendation_service]
            SVC_AI[ai_service]
            SVC_PROD[product_service]

            AI_RF[Random Forest Pipeline<br/>rf_pipeline.pkl]
            AI_DEB[NLI DeBERTa<br/>cross-encoder/nli-deberta-v3-small]
            AI_MINI[MiniLM<br/>all-MiniLM-L6-v2]

            REPO[Repositories Layer]
        end

        subgraph PG["rmit-postgres · PostgreSQL 16 :5432"]
            DB[(products<br/>reviews<br/>users<br/>orders<br/>photos)]
        end

        subgraph OS["rmit-opensearch · OpenSearch 2.13 :9200"]
            IDX[products index<br/>385-dim KNN vectors]
        end
    end

    UI -->|HTTP REST| NGINX
    NGINX -->|proxy /api| MW
    MW --> R_PROD & R_REC & R_AI & R_REVIEW & R_USER & R_ORDER & R_AUTH & R_DASH & R_HEALTH

    R_PROD --> SVC_SEARCH & SVC_PROD
    R_REC  --> SVC_REC
    R_AI   --> SVC_AI

    SVC_SEARCH -->|multi_match query| IDX
    SVC_REC    -->|KNN query| IDX
    SVC_PROD   -->|upsert/delete| IDX

    SVC_AI  --> AI_RF & AI_DEB & AI_MINI

    SVC_SEARCH & SVC_REC & SVC_PROD & SVC_AI --> REPO
    REPO --> DB
```

---

## 3. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Framework | FastAPI | 0.111.0 |
| ASGI Server | Uvicorn | 0.30.1 |
| ORM | SQLAlchemy (async) | 2.0.31 |
| Async DB Driver | asyncpg | 0.29.0 |
| Relational Database | PostgreSQL | 16-alpine |
| Vector / Text Search | OpenSearch | 2.13.0 |
| Vector Embeddings | sentence-transformers | 3.0.1 |
| NLI Model | cross-encoder/nli-deberta-v3-small | Hugging Face |
| Sentence Similarity | all-MiniLM-L6-v2 | Hugging Face |
| ML Pipeline | scikit-learn | 1.5.1 |
| Text Preprocessing | NLTK, pyspellchecker, thefuzz | Various |
| Word Embeddings | Gensim (FastText) | ≥4.3 |
| Data Validation | Pydantic | 2.7.4 |
| Frontend Framework | React | 18.3.1 |
| Frontend Router | react-router-dom | 6.30.1 |
| Charts | Recharts | 3.8.1 |
| Build Tool | Vite | 5.4.10 |
| CSS Framework | Tailwind CSS | 3.4.18 |
| Language (backend) | Python | 3.11 |
| Language (frontend) | TypeScript | 5.6.3 |
| Package Manager | uv (Python), npm (Node) | Latest |
| Containerisation | Docker Compose | v2 |

---

## 4. Repository Layout

```
RMIT-Web-based-Data-Application/
├── app/                        # FastAPI service (PRIMARY)
│   ├── main.py                 # App factory + lifespan hooks
│   ├── config.py               # Env-var config
│   ├── database.py             # SQLAlchemy async engine
│   ├── routers/                # HTTP endpoint handlers
│   │   ├── ai.py               # ML inference endpoints
│   │   ├── products.py         # Product CRUD + search
│   │   ├── recommendations.py  # KNN similar products
│   │   ├── reviews.py          # Review CRUD
│   │   ├── users.py            # User CRUD
│   │   ├── orders.py           # Order management
│   │   ├── auth.py             # Login
│   │   ├── dashboard.py        # Analytics KPIs
│   │   └── health.py           # Liveness probe
│   ├── services/               # Business logic
│   ├── repositories/           # Data access (SQL)
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic DTOs
│   ├── ai/                     # ML pipelines & preprocessors
│   │   ├── pipeline.py         # Random Forest loader
│   │   ├── semantic_pipeline.py# DeBERTa + MiniLM
│   │   ├── preprocessor.py     # Tokenise → clean → lemmatise
│   │   ├── transformers.py     # TF-IDF, FastText embedders
│   │   └── model/rf_pipeline.pkl
│   ├── opensearch/             # OpenSearch client & DSL builders
│   └── migrations/             # SQL schema versions
├── ui/                         # React 18 + TypeScript SPA
│   └── src/
│       ├── pages/              # LoginPage, BuyerPage, ManagePage, DashboardPage …
│       ├── components/         # ProductCard, ProductDetailPage, NavBar …
│       └── api.ts              # Typed fetch wrappers
├── data/product-photos/        # Uploaded product images
├── docs/                       # Technical documentation (here)
├── specs/                      # Project specifications / ADRs
└── docker-compose.yml
```

---

## 5. Backend Layering

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Router  (app/routers/*.py)                                  │
│  • Declare HTTP method, path, query params, body schema      │
│  • Inject FastAPI dependencies (db session, opensearch)      │
│  • Delegate ALL logic to Service layer                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Service  (app/services/*.py)                                │
│  • Orchestrate business rules across repos / external APIs   │
│  • Own ML inference calls and background task scheduling     │
│  • No SQL queries here — delegates to Repository             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Repository  (app/repositories/*.py)                         │
│  • Raw SQLAlchemy async queries, no business logic           │
│  • Returns ORM model instances                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                ▼                        ▼
         PostgreSQL                 OpenSearch
         (SQLAlchemy)               (opensearch-py)
```

---

## 6. Database Schema

### Core entities

```mermaid
erDiagram
    users {
        bigint id PK
        varchar email
        varchar password_hash
        varchar full_name
        varchar role
        varchar location
        smallint age
        varchar job
        varchar gender
        timestamp created_at
        timestamp updated_at
    }

    products {
        bigint id PK
        varchar brand
        varchar name
        text description
        numeric price
        varchar category
        timestamp created_at
        timestamp updated_at
    }

    photos {
        bigint id PK
        bigint product_id FK
        text url
        boolean is_primary
        int sort_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    reviews {
        bigint id PK
        bigint user_id FK
        bigint product_id FK
        varchar title
        text content
        smallint rating
        varchar status
        boolean ai_label
        boolean final_label
        varchar ai_model
        timestamp created_at
        timestamp updated_at
    }

    orders {
        bigint id PK
        bigint user_id FK
        numeric total_amount
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    order_items {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        int quantity
        numeric unit_price
    }

    users ||--o{ reviews : writes
    users ||--o{ orders : places
    products ||--o{ reviews : receives
    products ||--o{ photos : has
    products ||--o{ order_items : included_in
    orders ||--o{ order_items : contains
```

### Review status lifecycle

| `status` | Meaning |
|---|---|
| `pending` | Review inserted; inference not yet complete |
| `ai_completed` | Background AI task finished; `ai_label` set |
| `human_completed` | Human reviewer confirmed; `final_label` set |

---

## 7. OpenSearch Integration

### Index structure

Each product document in the `products` index contains:

```json
{
  "product_id": 42,
  "name": "Argan Oil Shampoo",
  "brand": "Herbal Essences",
  "category": "haircare",
  "item_vector": [0.12, -0.34, ..., 0.67]
}
```

- **`item_vector`** — 385-dimensional float array:
  - dims 1–384: sentence-transformers encoding of `"{brand} {name} {description}"` via `all-MiniLM-L6-v2`
  - dim 385: normalised price `price / max_price` (cached per process)
- **KNN index:** HNSW graph with cosine similarity, `ef_construction=256`, `m=48`

### Indexing pipeline

```mermaid
sequenceDiagram
    participant Script as reindex_products.py
    participant PG as PostgreSQL
    participant ST as SentenceTransformer
    participant OS as OpenSearch

    Script->>PG: SELECT id, brand, name, description, price FROM products
    PG-->>Script: rows[]

    Script->>PG: SELECT MAX(price)
    PG-->>Script: max_price

    loop per product batch
        Script->>ST: encode("{brand} {name} {description}")
        ST-->>Script: float[384]
        Script->>Script: append(price / max_price) → float[385]
        Script->>OS: bulk upsert { product_id, item_vector, name, brand, category }
    end
    OS-->>Script: bulk response
```

---

## 8. API Reference

### Base URL

```
http://localhost:8080/api/v1
```

All responses are wrapped:

```json
{ "data": { ... } }
```

---

### 8.1 `GET /products/search` — OpenSearch Name Search

**Summary:** Full-text search for products by name with fuzzy matching.

#### Request

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `q` | query | string | yes | Search keyword(s) |
| `limit` | query | int (1–100) | no | Max results (default 10) |

#### Example

```http
GET /api/v1/products/search?q=argan+shampoo&limit=5
```

#### Response

```json
{
  "data": {
    "total": 12,
    "total_pages": 3,
    "limit": 5,
    "items": [
      {
        "id": 42,
        "brand": "Herbal Essences",
        "name": "Argan Oil Shampoo",
        "price": 9.04,
        "category": "haircare",
        "avg_rating": 4.3,
        "review_count": 120,
        "photos": [...]
      }
    ]
  }
}
```

#### Sequence Diagram

```mermaid
sequenceDiagram
    actor Client
    participant Router as products.py<br/>GET /search
    participant SvcS as search_service
    participant OS as OpenSearch<br/>products index
    participant Repo as product_repo
    participant PG as PostgreSQL

    Client->>Router: GET /products/search?q=argan+shampoo&limit=5

    Router->>SvcS: search_products_by_name(os_client, db, "argan shampoo", size=5)

    Note over SvcS: Trim & validate keyword

    SvcS->>OS: POST /products/_search<br/>{ multi_match: { query, fields: ["name"], fuzziness: "AUTO" } }
    OS-->>SvcS: { hits: { total: 12, hits: [{_source:{product_id:42}}, ...] } }

    SvcS->>SvcS: Extract ordered product_ids from hits

    SvcS->>Repo: get_by_ids_in_order(db, [42, 17, ...])
    Repo->>PG: SELECT * FROM products WHERE id IN (...) + photos JOIN
    PG-->>Repo: Product ORM rows (with photos eager-loaded)
    Repo-->>SvcS: products[]

    SvcS-->>Router: (products[], total=12)

    Router->>Repo: get_review_stats(db, [42, 17, ...])
    Repo->>PG: SELECT product_id, COUNT(*), AVG(rating) FROM reviews GROUP BY product_id
    PG-->>Repo: stats dict
    Repo-->>Router: { 42: {avg_rating: 4.3, review_count: 120}, ... }

    Router->>Router: Build ProductResponse DTOs

    Router-->>Client: 200 { data: { total, total_pages, limit, items[] } }
```

#### OpenSearch DSL

```json
{
  "size": 5,
  "query": {
    "multi_match": {
      "query": "argan shampoo",
      "fields": ["name"],
      "type": "best_fields",
      "fuzziness": "AUTO"
    }
  }
}
```

`fuzziness: "AUTO"` allows 1-character edit distance on terms ≥5 chars, enabling typo-tolerant search.

---

### 8.2 `GET /recommendations/similar/{product_id}` — KNN + Profile Re-ranking

**Summary:** Returns the most similar products for a given product. Supports two modes — anonymous (pure KNN) and logged-in (KNN + buyer-profile re-ranking).

#### Request

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `product_id` | path | int | yes | Source product ID |
| `limit` | query | int (1–10) | no | Number of results (default 4) |
| `user_id` | query | int | no | Logged-in user ID — enables profile re-ranking |

#### Example

```http
GET /api/v1/recommendations/similar/42?limit=4&user_id=7
```

#### Response

```json
{
  "data": [
    {
      "product": { "id": 17, "brand": "OGX", "name": "Coconut Milk Shampoo", ... },
      "similarity": 0.8923
    }
  ]
}
```

#### Sequence Diagram — Anonymous Mode

```mermaid
sequenceDiagram
    actor Client
    participant Router as recommendations.py<br/>GET /similar/{product_id}
    participant Svc as recommendation_service
    participant OS as OpenSearch
    participant Repo as product_repo
    participant PG as PostgreSQL

    Client->>Router: GET /similar/42?limit=4

    Router->>Svc: get_similar_products(os_client, db, product_id=42, top_k=4, user=None)

    Svc->>OS: GET /products/_doc/42
    OS-->>Svc: { _source: { item_vector: [0.12, -0.34, ..., 0.67] } }

    Svc->>OS: POST /products/_search<br/>KNN query (vector, k=5)
    OS-->>Svc: top-5 hits with cosine _score

    Svc->>Svc: Exclude product_id=42 itself<br/>final_score = knn_score

    Svc->>Repo: get_by_ids_in_order(db, [17, 88, ...])
    Repo->>PG: SELECT products + photos
    PG-->>Repo: Product rows
    Repo-->>Svc: products[]

    Svc->>Repo: get_review_stats(db, [17, 88, ...])
    Repo->>PG: SELECT product_id, COUNT, AVG(rating)
    PG-->>Repo: stats
    Repo-->>Svc: stats dict

    Svc-->>Router: [{ product: ProductResponse, similarity: 0.8923 }, ...]
    Router-->>Client: 200 { data: [...] }
```

#### Sequence Diagram — Logged-in Mode (with Profile Re-ranking)

```mermaid
sequenceDiagram
    actor Client
    participant Router as recommendations.py
    participant UserRepo as user_repo
    participant Svc as recommendation_service
    participant OS as OpenSearch
    participant PG as PostgreSQL

    Client->>Router: GET /similar/42?limit=4&user_id=7

    Router->>UserRepo: get_by_id(db, 7)
    UserRepo->>PG: SELECT * FROM users WHERE id=7
    PG-->>UserRepo: User(age=28, location="Melbourne", job="engineer", gender="female")
    UserRepo-->>Router: user

    Router->>Svc: get_similar_products(..., product_id=42, top_k=4, user=user)

    Svc->>OS: GET /products/_doc/42
    OS-->>Svc: item_vector[385]

    Note over Svc: candidate_count = 50 (logged-in mode)

    Svc->>OS: POST /products/_search<br/>KNN query (vector, k=50)
    OS-->>Svc: top-50 hits with knn_score

    Svc->>Svc: Exclude product_id=42<br/>Build candidates list

    Svc->>PG: Buyer profile query<br/>reviews JOIN users<br/>GROUP BY product_id<br/>→ median_age, top_location, top_job, top_gender
    PG-->>Svc: buyer_profiles dict

    loop For each candidate product
        Svc->>Svc: profile_score = _profile_score(user, profile)<br/>• age: max(0, 1 - |user.age - median_age| / 50)<br/>• location: exact match → 1.0 or 0.0<br/>• job: word-overlap → 1.0 or 0.0<br/>• gender: exact match → 1.0 or 0.0<br/>• average of available signals

        Svc->>Svc: final_score = 0.7 × knn_score + 0.3 × profile_score
    end

    Svc->>Svc: sort descending by final_score<br/>→ top_k=4 results

    Svc->>PG: Load Product rows + review stats for top-4 IDs
    PG-->>Svc: products[], stats dict

    Svc-->>Router: [{ product, similarity: final_score }, ...]
    Router-->>Client: 200 { data: [...] }
```

#### Scoring Formula

```
final_score = 0.7 × knn_score + 0.3 × profile_score

profile_score = mean([
    age_score,       # max(0, 1 - |user_age - median_buyer_age| / 50)
    location_score,  # 1.0 if location matches, else 0.0
    job_score,       # 1.0 if job words overlap, else 0.0
    gender_score,    # 1.0 if gender matches, else 0.0
])                   # Only available signals included; default 0.5 if no data
```

#### Fallback

If OpenSearch is unreachable, the service falls back to same-brand products from PostgreSQL (similarity returned as `0.0`).

---

### 8.3 `POST /ai/counting-predict` — Random Forest Classification

**Summary:** Classifies a review as genuine buyer (`true`) or not (`false`) using a trained Random Forest pipeline. Returns immediately; the DB write happens asynchronously in a background task.

#### Request

Supports two modes selected by query parameters:

**Mode A — New Review** (no `review_id`):

| Parameter | In | Type | Required |
|---|---|---|---|
| `product_id` | query | int | yes |
| `user_id` | query | int | yes |
| `threshold` | query | float 0–1 | no (default 0.5) |

```json
{
  "review_rating": 5,
  "review_title": "Great shampoo",
  "review_text": "Amazing product, works perfectly for my hair type."
}
```

**Mode B — Existing Review** (`review_id` provided):

| Parameter | In | Type | Required |
|---|---|---|---|
| `review_id` | query | int | yes |
| `threshold` | query | float 0–1 | no (default 0.5) |

```json
{
  "review_title": "Great shampoo",
  "review_text": "Amazing product, works perfectly for my hair type."
}
```

#### Response

```json
{ "message": "Thank you! Your review is processed" }
```

#### Sequence Diagram — Mode A (New Review)

```mermaid
sequenceDiagram
    actor Client
    participant Router as ai.py<br/>POST /counting-predict
    participant Svc as ai_service
    participant ProdRepo as product_repo
    participant RevRepo as review_repo
    participant PG as PostgreSQL
    participant BG as BackgroundTask

    Client->>Router: POST /ai/counting-predict?product_id=42&user_id=7<br/>Body: { review_rating:5, review_title, review_text }

    Router->>Svc: handle_predict(body, db, background_tasks, threshold=0.5,<br/>product_id=42, user_id=7)

    Note over Svc: Mode A path (review_id is None)

    Svc->>ProdRepo: get_by_id(db, 42)
    ProdRepo->>PG: SELECT * FROM products WHERE id=42
    PG-->>ProdRepo: Product(brand, name, price)
    ProdRepo-->>Svc: product

    Svc->>ProdRepo: get_review_stats(db, [42])
    ProdRepo->>PG: SELECT COUNT(*), AVG(rating) FROM reviews WHERE product_id=42
    PG-->>ProdRepo: { avg_rating: 4.2, review_count: 119 }
    ProdRepo-->>Svc: stats (captured BEFORE new review inserted)

    Svc->>RevRepo: create(db, ReviewCreate{user_id=7, product_id=42, rating=5, ...})
    RevRepo->>PG: INSERT INTO reviews (status='pending') RETURNING id
    PG-->>RevRepo: review_id=200
    RevRepo-->>Svc: Review(id=200)

    Svc->>Svc: Build _ReviewItem with 8 features

    Svc->>Router: schedule background_tasks.add_task(_run_prediction_and_write, item, 0.5)

    Router-->>Client: 200 { "message": "Thank you! Your review is processed" }

    Note over BG: After HTTP response sent

    BG->>BG: get_pipeline() → load rf_pipeline.pkl (cached)
    BG->>BG: preprocess_review_text(review_text)<br/>tokenise → clean → spellcheck → lemmatise

    BG->>BG: Build DataFrame with 8 columns:<br/>price, review_rating, avg_product_rating,<br/>product_rating_count, brand_name,<br/>review_title, product_title, processed_review_text

    BG->>BG: pipeline.predict_proba(df) → [[0.18, 0.82]]<br/>prob=0.82 ≥ threshold=0.5 → pred=1

    BG->>PG: UPDATE reviews SET<br/>ai_model="rf_pipeline|pred=1|prob=0.82",<br/>ai_label=true, status="ai_completed"<br/>WHERE id=200
```

#### Sequence Diagram — Mode B (Existing Review)

```mermaid
sequenceDiagram
    actor Client
    participant Router as ai.py<br/>POST /counting-predict
    participant Svc as ai_service
    participant RevRepo as review_repo
    participant ProdRepo as product_repo
    participant PG as PostgreSQL
    participant BG as BackgroundTask

    Client->>Router: POST /ai/counting-predict?review_id=200<br/>Body: { review_title, review_text }

    Router->>Svc: handle_predict(..., review_id=200)

    Note over Svc: Mode B path

    Svc->>RevRepo: get_by_id(db, 200)
    RevRepo->>PG: SELECT reviews.*, users.* FROM reviews JOIN users WHERE reviews.id=200
    PG-->>RevRepo: (Review, User)
    RevRepo-->>Svc: review (rating, product_id already known)

    Svc->>ProdRepo: get_by_id(db, review.product_id)
    ProdRepo->>PG: SELECT * FROM products WHERE id=42
    PG-->>ProdRepo: Product
    ProdRepo-->>Svc: product

    Svc->>RevRepo: get_stats_excluding(db, product_id=42, exclude_id=200)
    RevRepo->>PG: SELECT AVG(rating), COUNT(*) FROM reviews<br/>WHERE product_id=42 AND id != 200
    PG-->>RevRepo: (avg_rating=4.2, count=119)
    RevRepo-->>Svc: (avg_rating, count)

    Svc->>Svc: Build _ReviewItem (rating from existing review)
    Svc->>Router: schedule _run_prediction_and_write in background

    Router-->>Client: 200 { "message": "Thank you! Your review is processed" }

    BG->>BG: [same inference steps as Mode A]
    BG->>PG: UPDATE reviews SET ai_model, ai_label, status WHERE id=200
```

#### ML Feature Vector

| # | Feature | Source |
|---|---|---|
| 1 | `price` | `products.price` |
| 2 | `review_rating` | Request body (Mode A) or `reviews.rating` (Mode B) |
| 3 | `avg_product_rating` | `AVG(reviews.rating)` before this review |
| 4 | `product_rating_count` | `COUNT(reviews)` before this review |
| 5 | `brand_name` | `products.brand` |
| 6 | `review_title` | Request body |
| 7 | `product_title` | `products.name` |
| 8 | `processed_review_text` | Review text after tokenise → clean → lemmatise |

---

### 8.4 `POST /ai/semantic-predict` — Semantic Classification

**Summary:** Classifies a review using a semantic language model instead of the Random Forest. Supports the same Mode A / Mode B pattern as `/counting-predict`.

#### Additional Parameter

| Parameter | In | Type | Default | Description |
|---|---|---|---|---|
| `model` | query | enum | `nli-deberta-v3-small` | Model to use: `nli-deberta-v3-small` or `minilm` |

#### Available Models

| Model key | HuggingFace ID | Size | Method |
|---|---|---|---|
| `nli-deberta-v3-small` | `cross-encoder/nli-deberta-v3-small` | 141 MB | Zero-shot NLI entailment — does the review entail *"genuine buyer review"*? |
| `minilm` | `all-MiniLM-L6-v2` | 80 MB | Cosine similarity against length-matched anchor sentences |

#### Sequence Diagram

```mermaid
sequenceDiagram
    actor Client
    participant Router as ai.py<br/>POST /semantic-predict
    participant Svc as ai_service
    participant PG as PostgreSQL
    participant BG as BackgroundTask
    participant DEB as NLI DeBERTa<br/>(or MiniLM)

    Client->>Router: POST /ai/semantic-predict?product_id=42&user_id=7&model=nli-deberta-v3-small<br/>Body: { review_rating:5, review_title, review_text }

    Router->>Svc: handle_semantic_predict(..., model=SemanticModel.deberta)

    Note over Svc: Same Mode A / B resolution as counting-predict<br/>(product lookup, stats capture, review insert)

    Svc->>PG: [same DB operations as counting-predict Mode A/B]
    PG-->>Svc: resolved _ReviewItem

    Svc->>Router: schedule _run_semantic_prediction_and_write(item, threshold, model)

    Router-->>Client: 200 { "message": "Thank you! Your review is processed" }

    Note over BG: Background execution

    BG->>BG: get_semantic_model(SemanticModel.deberta)
    Note right of BG: Lazy singleton — model loaded once<br/>at first call, then cached

    alt NLI DeBERTa
        BG->>DEB: predict("Rating: 5/5. Great shampoo. Amazing product...",<br/>candidate_labels=["genuine buyer review", "not a buyer review"])
        DEB-->>BG: { scores: [0.82, 0.18] }
        BG->>BG: prob = 0.82
    else MiniLM
        BG->>DEB: encode(combined_text) → float[384]
        BG->>BG: compute cosine_similarity(embedding, anchor_embeddings)<br/>Anchor sentences vary by review text length
        BG->>BG: prob = normalised similarity score
    end

    BG->>BG: pred = 1 if prob >= threshold else 0

    BG->>PG: UPDATE reviews SET<br/>ai_model="nli-deberta-v3-small|pred=1|prob=0.82",<br/>ai_label=true, status="ai_completed"<br/>WHERE id=200
```

#### NLI DeBERTa Text Format

```
"Rating: {rating}/5. {review_title}. {review_text}"
```

Evaluated against the hypothesis: **"genuine buyer review"** vs **"not a buyer review"**.

#### MiniLM Anchor Sentences

MiniLM compares the review embedding against hand-crafted anchor sentences selected by review text length (tiny / short / medium / long) and returns the normalised cosine similarity.

---

### 8.5 `POST /ai/human-confirm` — Human Verdict

**Summary:** Records a human reviewer's verdict on an already-classified review, advancing the status to `human_completed`.

#### Request

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `review_id` | query | int | yes | Target review ID |
| `human_label` | query | bool | yes | `true` = genuine buyer, `false` = not a buyer |

#### Example

```http
POST /api/v1/ai/human-confirm?review_id=200&human_label=true
```

#### Response

```json
{ "message": "Review 200 confirmed: human_label=true" }
```

#### Sequence Diagram

```mermaid
sequenceDiagram
    actor Admin
    participant Router as ai.py<br/>POST /human-confirm
    participant RevRepo as review_repo
    participant PG as PostgreSQL

    Admin->>Router: POST /ai/human-confirm?review_id=200&human_label=true

    Router->>RevRepo: write_human_label(db, review_id=200, human_label=True)
    RevRepo->>PG: UPDATE reviews<br/>SET final_label=true, status="human_completed"<br/>WHERE id=200
    PG-->>RevRepo: rowcount=1

    alt Review found
        RevRepo-->>Router: True
        Router-->>Admin: 200 { "message": "Review 200 confirmed: human_label=true" }
    else Not found
        RevRepo-->>Router: False
        Router-->>Admin: 404 { "detail": "Review 200 not found." }
    end
```

---

## 9. AI Inference Pipelines

### Random Forest Pipeline (`ai/pipeline.py`)

```
Review Text
    │
    ▼ preprocess_review_text()
┌────────────────────────────────────┐
│  Text Preprocessor                  │
│  1. Lowercase + tokenise           │
│  2. Remove stopwords               │
│     (NLTK + custom EN list)        │
│  3. Spell-check (pyspellchecker)   │
│  4. Lemmatise (NLTK WordNetLemm.)  │
└─────────────────┬──────────────────┘
                  │ cleaned tokens
                  ▼
┌────────────────────────────────────┐
│  sklearn Pipeline (rf_pipeline.pkl)│
│  ┌──────────────────────────────┐  │
│  │  ColumnTransformer           │  │
│  │  • TF-IDF on text columns    │  │
│  │  • FastText mean embeddings  │  │
│  │  • Numeric passthrough       │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Random Forest Classifier    │  │
│  └──────────────────────────────┘  │
└─────────────────┬──────────────────┘
                  │ predict_proba → [p_not_buyer, p_buyer]
                  ▼
         p_buyer ≥ threshold  →  ai_label = True (buyer)
         p_buyer <  threshold  →  ai_label = False (not buyer)
```

### Semantic Pipelines (`ai/semantic_pipeline.py`)

```
Review Text (title + body + rating)
    │
    │  combined = "Rating: {rating}/5. {title}. {body}"
    │
    ├── NLI DeBERTa (cross-encoder/nli-deberta-v3-small)
    │       │
    │       ▼
    │   Cross-encoder scores hypothesis pair:
    │   ["genuine buyer review", "not a buyer review"]
    │       │
    │       ▼
    │   softmax(entailment_score) → prob ∈ [0,1]
    │
    └── MiniLM (all-MiniLM-L6-v2)
            │
            ▼
        SentenceTransformer.encode(combined_text) → float[384]
            │
            ▼
        cosine_similarity(embedding, anchor_embeddings[length_bucket])
            │
            ▼
        Normalised score → prob ∈ [0,1]

Both paths: pred = 1 if prob ≥ threshold else 0
```

---

## 10. Review Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : Review inserted (Mode A creates new row /<br/>Mode B reuses existing)

    pending --> ai_completed : Background task completes<br/>ai_label + ai_model written

    ai_completed --> human_completed : POST /ai/human-confirm<br/>final_label set by human

    human_completed --> [*]

    pending --> pending : (waiting for background task)
    ai_completed --> ai_completed : (awaiting human review)
```

---

## 11. Deployment

### Docker Compose Services

| Service | Image | Port | Role |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | Relational data store |
| `opensearch` | `opensearchproject/opensearch:2.13.0` | 9200 | Vector KNN + text search |
| `app` | Custom (Python 3.11 + uv) | 8080 | FastAPI REST API + AI inference |
| `ui` | Custom (Node 20 → Nginx) | 3000 | React SPA (static) |

### Startup Sequence

```mermaid
sequenceDiagram
    participant DC as Docker Compose
    participant PG as postgres
    participant OS as opensearch
    participant APP as app (FastAPI)
    participant UI as ui (Nginx)

    DC->>PG: docker compose up postgres
    PG-->>DC: healthy (pg_isready)

    DC->>OS: docker compose up opensearch
    OS-->>DC: healthy (HTTP 200 on :9200)

    DC->>APP: docker compose up app<br/>(depends_on: postgres healthy, opensearch healthy)
    APP->>PG: SELECT 1 (connectivity check)
    APP->>OS: OpenSearch client init
    APP->>APP: Load rf_pipeline.pkl
    APP->>APP: Load NLI DeBERTa + MiniLM models
    APP-->>DC: healthy (/api/v1/health 200)

    DC->>UI: docker compose up ui<br/>(depends_on: app healthy)
    UI-->>DC: Nginx serving :3000
```

### First-Run Operations

```bash
# 1. Copy and configure environment
cp .env.example .env

# 2. Start all services
docker compose up -d

# 3. Apply database migrations
make migratedb

# 4. Load sample data
make snapshotdb

# 5. Create OpenSearch index
make opensearchinit

# 6. Encode and upload product vectors
make reindexproducts

# 7. Verify
curl http://localhost:8080/api/v1/health
```

### Health Check

```http
GET /api/v1/health
→ 200 OK
```

---

## 12. Environment Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://rmit:rmit@localhost:5432/rmit` | PostgreSQL connection string (auto-adapted to asyncpg) |
| `POSTGRES_USER` | `rmit` | Postgres username |
| `POSTGRES_PASSWORD` | `rmit` | Postgres password |
| `POSTGRES_DB` | `rmit` | Postgres database name |
| `OPENSEARCH_URL` | `http://localhost:9200` | OpenSearch base URL (`http://opensearch:9200` inside Docker) |
| `OPENSEARCH_INDEX_PRODUCTS` | `products` | OpenSearch index name for products |
| `PORT` | `8080` | Uvicorn listen port |
| `ENV` | `development` | Runtime environment |
| `PRODUCT_PHOTOS_DIR` | `./data/product-photos` | Upload storage path (Docker: `/var/lib/beauty-app/product-photos`) |
| `VITE_API_HOST` | `http://localhost:8080` | Frontend → backend URL (build-time Vite arg) |

> **Note:** Phase 1 does not use JWT authentication. `JWT_SECRET` and `JWT_EXPIRY_HOURS` are reserved for Phase 2.

---

*Generated from source — RMIT Beauty App v1.0.0*
