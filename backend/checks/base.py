from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any, Optional


class Severity(str, Enum):
    FATAL = "fatal"
    ERROR = "error"
    WARN = "warn"
    INFO = "info"
    REVIEW = "review"


@dataclass
class Finding:
    code: str
    message: str
    severity: Severity
    path: str = "$"
    suggestion: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["severity"] = self.severity.value
        return d