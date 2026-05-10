# Research: SPEC-03 — OpenSearch Index Mapping & Search Logic

## Decision 1: Versioned mapping files
- **Decision**: Keep `products_mapping.v1.json` as immutable versioned artifact, and `products_mapping.json` as active pointer.
- **Rationale**: Enables safe evolution and easier rollback/testing.
- **Alternatives considered**: Single mutable mapping file only (rejected due to weak traceability).

## Decision 2: Hybrid retrieval strategy
- **Decision**: Support both lexical keyword retrieval and semantic vector retrieval with explicit fallback.
- **Rationale**: Improves robustness across query styles and low-signal inputs.
- **Alternatives considered**: Lexical-only (insufficient semantic coverage), semantic-only (worse precision on exact SKU/brand terms).

## Decision 3: Reindex as explicit operational step
- **Decision**: Keep reindex as explicit command/script rather than hidden side-effect.
- **Rationale**: Predictable operational behavior and debuggability.
- **Alternatives considered**: Silent background reindex (rejected for complexity and observability concerns).

## Decision 4: Relevance validation via fixed query set
- **Decision**: Maintain a documented relevance test set in contracts.
- **Rationale**: Prevents subjective regression checks.
- **Alternatives considered**: Ad-hoc manual testing only (rejected due to inconsistency).
