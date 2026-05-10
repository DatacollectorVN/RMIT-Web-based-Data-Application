package opensearch

func BuildKeywordQuery(req QueryRequest) map[string]any {
	req = NormalizeRequest(req)
	return map[string]any{
		"size": req.Size,
		"query": map[string]any{
			"multi_match": map[string]any{
				"query":  req.Keyword,
				"fields": []string{"name^3", "brand^2", "description", "category"},
				"type":   "best_fields",
			},
		},
	}
}
