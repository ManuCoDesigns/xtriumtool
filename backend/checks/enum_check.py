"""Step 6 — Enumerated values."""
from .base import Finding, Severity
from .walker import walk_with_schema


def run(payload, schema) -> list[Finding]:
    if not schema:
        return []
    findings: list[Finding] = []
    for value, sub_schema, path in walk_with_schema(payload, schema):
        allowed = sub_schema.get("enum")
        if allowed and value is not None and value not in allowed:
            findings.append(Finding(
                code="ENUM_VIOLATION",
                message=f"{value!r} not in {allowed}",
                severity=Severity.ERROR,
                path=path,
                suggestion=f"Use one of {allowed}",
            ))
    return findings