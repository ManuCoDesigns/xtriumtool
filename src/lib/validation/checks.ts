import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";

export type Severity = "fatal" | "error" | "warn" | "info" | "review";
export interface Finding {
  code: string;
  message: string;
  severity: Severity;
  path: string;
  suggestion?: string;
}

const URL_HINTS = ["url", "website", "link", "datasheet_url", "source_url"];
const QTY_HINTS = ["quantity", "qty", "count", "tier"];

function* walk(payload: unknown, schema: any, path = "$"): Generator<{ value: unknown; sub: any; path: string }> {
  yield { value: payload, sub: schema || {}, path };
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const props = (schema || {}).properties || {};
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      yield* walk(v, props[k], `${path}.${k}`);
    }
  } else if (Array.isArray(payload)) {
    const items = (schema || {}).items || {};
    for (let i = 0; i < payload.length; i++) {
      yield* walk(payload[i], items, `${path}[${i}]`);
    }
  }
}

function isNullable(s: any): boolean {
  const t = s?.type;
  return Array.isArray(t) ? t.includes("null") : s?.nullable === true;
}

function isUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validate(payload: unknown, schema: any): {
  ok: boolean;
  summary: { fatal: number; errors: number; warnings: number; info: number };
  findings: Finding[];
  ready_for_llm: boolean;
} {
  const findings: Finding[] = [];

  // 1. JSON root
  if (!payload || (typeof payload !== "object")) {
    findings.push({
      code: "INVALID_JSON_ROOT",
      message: `Root must be an object or array, got ${typeof payload}`,
      severity: "fatal", path: "$",
    });
  }

  // 2. Schema (ajv)
  if (schema) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const v = ajv.compile(schema);
    if (!v(payload)) {
      for (const err of v.errors || []) {
        findings.push({
          code: "SCHEMA_VIOLATION",
          message: err.message || "schema violation",
          severity: "fatal",
          path: "$" + (err.instancePath || ""),
        });
      }
    }
  }

  // 3..7 walker-based checks
  for (const { value, sub, path } of walk(payload, schema || {})) {
    const key = path.split(".").pop()!.toLowerCase().replace(/\[\d+\]$/, "");

    // null check
    if (value === null && sub && Object.keys(sub).length && !isNullable(sub)) {
      findings.push({ code: "NULL_NOT_ALLOWED", message: "Field is not nullable", severity: "error", path });
    }

    if (value === null || value === undefined) continue;

    // url
    if ((sub?.format === "uri" || URL_HINTS.some((h) => key.includes(h))) && typeof value === "string" && value !== "") {
      if (!isUrl(value)) {
        findings.push({ code: "INVALID_URL", message: `Not a valid URL: ${value}`, severity: "error", path });
      }
    }
    // qty
    if (QTY_HINTS.some((h) => key.includes(h)) && typeof value === "number" && value < 1) {
      findings.push({ code: "QTY_LT_ONE", message: `Quantity must be >= 1, got ${value}`, severity: "error", path });
    }
    // regex pattern
    if (sub?.pattern && typeof value === "string" && !new RegExp(sub.pattern).test(value)) {
      findings.push({ code: "PATTERN_MISMATCH", message: `Doesn't match /${sub.pattern}/`, severity: "error", path });
    }
    // enum
    if (sub?.enum && !sub.enum.includes(value as never)) {
      findings.push({
        code: "ENUM_VIOLATION", message: `${JSON.stringify(value)} not in ${JSON.stringify(sub.enum)}`,
        severity: "error", path, suggestion: `Use one of ${JSON.stringify(sub.enum)}`,
      });
    }
    // unit — datasets use many domain-specific units (W/m·K, kg/m³, MPa, etc.).
    // We accept any non-empty string; canonicalization is left to downstream tools.
  }

  // 8. null density
  const counts = countNulls(payload);
  const ratio = counts.total > 0 ? counts.nulls / counts.total : 0;
  if (ratio > 0.4) {
    findings.push({
      code: "HIGH_NULL_DENSITY",
      message: `Null ratio ${(ratio * 100).toFixed(0)}% exceeds 40% threshold`,
      severity: "warn", path: "$", suggestion: "Manual review recommended",
    });
  }

  const summary = {
    fatal: findings.filter((f) => f.severity === "fatal").length,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warn").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
  return {
    ok: summary.fatal === 0 && summary.errors === 0,
    summary,
    findings,
    ready_for_llm: summary.fatal === 0 && summary.errors === 0,
  };
}

function countNulls(obj: unknown): { total: number; nulls: number } {
  let total = 0, nulls = 0;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      total++;
      if (v === null) nulls++;
      const r = countNulls(v); total += r.total; nulls += r.nulls;
    }
  } else if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = countNulls(v); total += r.total; nulls += r.nulls;
    }
  }
  return { total, nulls };
}