"""Orchestrates the validation checks in order."""
from typing import Any
from checks import Finding, Severity
from checks import (
    json_check, schema_check, types_check, null_check,
    advanced_check, enum_check, unit_check, null_density,
)

PIPELINE = [
    ("json", json_check, True),
    ("schema", schema_check, True),
    ("types", types_check, False),
    ("nulls", null_check, False),
    ("advanced", advanced_check, False),
    ("enums", enum_check, False),
    ("units", unit_check, False),
    ("null_density", null_density, False),
]


def run_pipeline(payload: Any, schema: dict | None) -> dict:
    findings: list[Finding] = []
    fatal = False
    for name, mod, is_fatal_gate in PIPELINE:
        if fatal and is_fatal_gate:
            break
        try:
            new = mod.run(payload, schema)
        except Exception as e:
            new = [Finding(code=f"{name.upper()}_CRASH", message=str(e),
                           severity=Severity.ERROR)]
        findings.extend(new)
        if any(f.severity == Severity.FATAL for f in new):
            fatal = True

    summary = {
        "fatal": sum(1 for f in findings if f.severity == Severity.FATAL),
        "errors": sum(1 for f in findings if f.severity == Severity.ERROR),
        "warnings": sum(1 for f in findings if f.severity == Severity.WARN),
        "info": sum(1 for f in findings if f.severity == Severity.INFO),
    }
    ready_for_llm = summary["fatal"] == 0 and summary["errors"] == 0
    return {
        "ok": summary["fatal"] == 0 and summary["errors"] == 0,
        "summary": summary,
        "findings": [f.to_dict() for f in findings],
        "ready_for_llm": ready_for_llm,
    }