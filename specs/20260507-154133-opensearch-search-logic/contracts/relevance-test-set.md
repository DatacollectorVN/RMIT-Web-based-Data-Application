# Relevance Test Set

## Keyword queries
1. `hydrating cleanser` -> expect `Hydrating Gel Cleanser` in top-5
2. `niacinamide serum` -> expect `Niacinamide 10% Serum` in top-5
3. `spf sunscreen` -> expect `SPF50 Daily Sunscreen` in top-5
4. `tea tree spot` -> expect `Tea Tree Spot Gel` in top-5
5. `ceramide moisturizer` -> expect `Ceramide Moisture Cream` in top-5

## Semantic intent checks
- `products for oily skin texture` -> expect oil-control/treatment items in top-10
- `daily sun protection no white cast` -> expect sunscreen items in top-10
- `night anti-aging cream` -> expect night cream/retinol items in top-10

## Pass criteria
- SC-001: >=85% keyword queries include an expected product in top-5.
- SC-003: >=80% semantic intents include relevant product in top-10.

## Execution notes
- Use `scripts/search_relevance_check.sh` for keyword checks.
- Use semantic query flow from `backend/opensearch/semantic_search.go` for intent checks.
