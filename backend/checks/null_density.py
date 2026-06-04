"""Step 8 — Flag records with too many nulls for manual review."""
from .base import Finding, Severity

THRESHOLD = 0.4


def _count(obj):
    total = 0
    nulls = 0
    if isinstance(obj, dict):
        for v in obj.values():
            t, n = _count(v)
            total += t + 1
            nulls += n + (1 if v is None else 0)
    elif isinstance(obj, list):
        for v in obj:
            t, n = _count(v)
            total += t
            nulls += n
    return total, nulls


def run(payload, schema=None) -> list[Finding]:
    total, nulls = _count(payload)
    if total == 0:
        return []
    ratio = nulls / total
    if ratio > THRESHOLD:
        return [Finding(
            code="HIGH_NULL_DENSITY",
            message=f"Null ratio {ratio:.0%} exceeds threshold {THRESHOLD:.0%}",
            severity=Severity.WARN,
            path="$",
            suggestion="Manual review recommended",
        )]
    return []