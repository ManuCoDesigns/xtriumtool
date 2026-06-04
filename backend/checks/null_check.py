"""Step 4 — Only fields marked nullable may be null."""
from .base import Finding, Severity
from .walker import walk_with_schema


def _is_nullable(s: dict) -> bool:
    t = s.get("type")
    if isinstance(t, list) and "null" in t:
        return True
    if s.get("nullable") is True:
        return True
    return False


def run(payload, schema) -> list[Finding]:
    if not schema:
        return []
    findings: list[Finding] = []
    for value, sub_schema, path in walk_with_schema(payload, schema):
        if value is None and not _is_nullable(sub_schema):
            findings.append(Finding(
                code="NULL_NOT_ALLOWED",
                message="Field is not nullable but received null",
                severity=Severity.ERROR,
                path=path,
            ))
    return findings