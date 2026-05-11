# Contract: OpenSearch `product_id` (numeric)

## Index mapping

Field `product_id`:

- **Type**: `long` (64-bit integer)
- **Must** equal PostgreSQL `products.id` after reindex.

## Bulk indexing

- Document `_id` MAY be the string representation of the integer product id (e.g. `"7"`) for OpenSearch `_id` compatibility.
- Field `product_id` inside `_source` MUST be a JSON number (or equivalent numeric type accepted by OpenSearch) consistent with `long`.

## Reindex script

`app/scripts/reindex_products.py` (or successor) MUST:

- Read integer `id` from PostgreSQL `products`.
- Write `product_id` in the bulk body as that integer.
- Update any placeholder vector seeding to use string form of id if seed text is built from identifiers.

## Init / mapping version

- Bump mapping artifact (e.g. `products_mapping.v2.json`) when changing `product_id` from `keyword` to `long`.
- `opensearch/init.sh` / `products_mapping.json` pointer MUST reference the version that includes `long` for `product_id`.
