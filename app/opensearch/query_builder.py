from dataclasses import dataclass, field


@dataclass
class QueryRequest:
    keyword: str = ""
    vector: list[float] = field(default_factory=list)
    filters: dict = field(default_factory=dict)
    size: int = 10


def normalize_request(req: QueryRequest) -> QueryRequest:
    if req.size <= 0:
        req.size = 10
    return req
