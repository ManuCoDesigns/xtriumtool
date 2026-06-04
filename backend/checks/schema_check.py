"""Step 2 — JSON Schema validation (Draft 2020-12)."""
from jsonschema import Draft202012Validator
from .base import Finding, Severity


def run(payload, schema) -> list[Finding]:
    if not schema:
        return []
    validator = Draft202012Validator(schema)
    findings: list[Finding] = []
    for err in validator.iter_errors(payload):
        path = "$" + "".join(f"[{repr(p)}]" if isinstance(p, int) else f".{p}" for p in err.absolute_path)
        findings.append(Finding(
            code="SCHEMA_VIOLATION",
            message=err.message,
            severity=Severity.FATAL,
            path=path,
        ))
    return findings