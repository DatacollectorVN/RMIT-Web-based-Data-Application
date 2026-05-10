package opensearch

func BuildSemanticQuery(req QueryRequest) map[string]any {
	req = NormalizeRequest(req)
	return map[string]any{
		"size": req.Size,
		"query": map[string]any{
			"knn": map[string]any{
				"item_vector": map[string]any{
					"vector": req.Vector,
					"k":      req.Size,
				},
			},
		},
	}
}
