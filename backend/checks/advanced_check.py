"""Step 5 — URL format, quantity >= 1, regex patterns."""
import re
from urllib.parse import urlparse
from .base import Finding, Severity
from .walker import walk_with_schema

_URL_HINTS = ("url", "website", "link", "datasheet_url", "source_url")
_QTY_HINTS = ("quantity", "qty", "count", "tier")


def _is_url(v) -> bool:
    try:
        u = urlparse(str(v))
        return u.scheme in ("http", "https") and bool(u.netloc)
    except Exception:
        return False


def run(payload, schema) -> list[Finding]:
    findings: list[Finding] = []
    for value, sub_schema, path in walk_with_schema(payload, schema or {}):
        if value is None:
            continue
        key = path.rsplit(".", 1)[-1].lower()
        fmt = sub_schema.get("format")
        if (fmt == "uri" or any(h in key for h in _URL_HINTS)) and isinstance(value, str):
            if value and not _is_url(value):
                findings.append(Finding(
                    code="INVALID_URL", message=f"Not a valid URL: {value}",
                    severity=Severity.ERROR, path=path,
                ))
        if any(h in key for h in _QTY_HINTS) and isinstance(value, (int, float)) and not isinstance(value, bool):
            if value < 1:
                findings.append(Finding(
                    code="QTY_LT_ONE", message=f"Quantity must be >= 1, got {value}",
                    severity=Severity.ERROR, path=path,
                ))
        pattern = sub_schema.get("pattern")
        if pattern and isinstance(value, str) and not re.search(pattern, value):
            findings.append(Finding(
                code="PATTERN_MISMATCH",
                message=f"Value does not match /{pattern}/",
                severity=Severity.ERROR, path=path,
            ))
    return findings