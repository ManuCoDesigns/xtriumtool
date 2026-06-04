"""Step 3 — Basic type checks driven by schema property declarations."""
from .base import Finding, Severity
from .walker import walk_with_schema

_TYPE_MAP = {
    "string": str, "integer": int, "number": (int, float),
    "boolean": bool, "object": dict, "array": list, "null": type(None),
}


def run(payload, schema) -> list[Finding]:
    findings: list[Finding] = []
    if not schema:
        return findings
    for value, sub_schema, path in walk_with_schema(payload, schema):
        expected = sub_schema.get("type")
        if not expected or value is None:
            continue
        types = expected if isinstance(expected, list) else [expected]
        py_types = tuple(t for t in (_TYPE_MAP.get(x) for x in types) if t)
        if py_types and not isinstance(value, py_types):
            # bool is subclass of int — guard
            if "boolean" not in types and isinstance(value, bool):
                pass
            else:
                findings.append(Finding(
                    code="TYPE_MISMATCH",
                    message=f"Expected {types}, got {type(value).__name__}",
                    severity=Severity.ERROR,
                    path=path,
                ))
    return findings