"""Step 7 — Canonical unit names."""
from .base import Finding, Severity
from .walker import walk_with_schema

CANONICAL = {
    "m": "meter", "mtr": "meter", "metre": "meter", "meters": "meter",
    "kg": "kilogram", "kgs": "kilogram", "kilo": "kilogram",
    "g": "gram", "gm": "gram", "grams": "gram",
    "t": "tonne", "ton": "tonne", "tons": "tonne",
    "l": "liter", "ltr": "liter", "litre": "liter",
}
ACCEPTED = set(CANONICAL.values())


def run(payload, schema=None) -> list[Finding]:
    findings: list[Finding] = []
    for value, _sub, path in walk_with_schema(payload, schema or {}):
        if not isinstance(value, str):
            continue
        key = path.rsplit(".", 1)[-1].lower()
        if key != "unit" and not key.endswith("_unit"):
            continue
        v = value.strip().lower()
        if v in ACCEPTED:
            continue
        if v in CANONICAL:
            findings.append(Finding(
                code="UNIT_NON_CANONICAL",
                message=f"Unit '{value}' should be '{CANONICAL[v]}'",
                severity=Severity.ERROR, path=path,
                suggestion=CANONICAL[v],
            ))
        else:
            findings.append(Finding(
                code="UNIT_UNKNOWN",
                message=f"Unknown unit '{value}'",
                severity=Severity.WARN, path=path,
            ))
    return findings