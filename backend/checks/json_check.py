"""Step 1 — Valid JSON parsing (input is already parsed; verify it's a dict/list)."""
from .base import Finding, Severity


def run(payload, schema=None) -> list[Finding]:
    if not isinstance(payload, (dict, list)):
        return [Finding(
            code="INVALID_JSON_ROOT",
            message=f"Root must be an object or array, got {type(payload).__name__}",
            severity=Severity.FATAL,
        )]
    return []