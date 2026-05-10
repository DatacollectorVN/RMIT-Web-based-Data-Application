class NotFoundError(Exception):
    """Raised when a requested resource does not exist."""


class UnauthorisedError(Exception):
    """Raised when the caller lacks permission to perform an action."""


class ConflictError(Exception):
    """Raised when an operation conflicts with existing state (e.g. duplicate)."""


class ValidationError(Exception):
    """Raised when input data fails business-rule validation (maps to HTTP 400)."""
