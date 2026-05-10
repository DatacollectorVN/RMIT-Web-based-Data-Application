package opensearch

func SelectQuery(req QueryRequest) map[string]any {
	if len(req.Vector) > 0 {
		return BuildSemanticQuery(req)
	}
	if req.Keyword != "" {
		return BuildKeywordQuery(req)
	}
	// Safe fallback: match all with low size.
	return map[string]any{
		"size": 5,
		"query": map[string]any{
			"match_all": map[string]any{},
		},
	}
}
