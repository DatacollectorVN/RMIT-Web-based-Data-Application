# Data Model: SPEC-03 Search Documents and Operations

## Search Document (Product)
- `product_id`: unique identifier
- `brand`: lexical search field
- `name`: primary lexical search field
- `description`: long text search field
- `category`: filter/relevance field
- `price`: sortable/numeric field
- `item_vector`: semantic vector field for similarity retrieval

## Search Query
- `keyword_query`: user text query for lexical retrieval
- `semantic_vector`: computed vector for similarity retrieval
- `filters`: optional constraints (category, price range)
- `size`: result size limit (default 10)

## Reindex Run
- `started_at`, `completed_at`
- `documents_indexed`
- `documents_failed`
- `error_samples`
- `target_index`

## Relationships
- Each product row from PostgreSQL maps to one OpenSearch product document.
- Reindex run transforms and upserts all eligible products.
- Semantic retrieval can fallback to keyword retrieval when vector input is missing.
