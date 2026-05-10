package opensearch

type QueryRequest struct {
	Keyword string
	Vector  []float32
	Filters map[string]any
	Size    int
}

func NormalizeRequest(req QueryRequest) QueryRequest {
	if req.Size <= 0 {
		req.Size = 10
	}
	if req.Filters == nil {
		req.Filters = map[string]any{}
	}
	return req
}
