# Dataset Submission, Validation & LLM Review Tool

End-to-end pipeline for validating contractor-submitted JSON datasets (built around
the **Xtrium Supplier Graph Schema v1.0** — see `SOP_BGS_to_Xtrium`) and performing
a final LLM-assisted reconciliation against the original source webpage.

## Features

- **Role-based access control**: Super Admin, Admin, Reviewer, Submitter
- **User authentication**: Sign up, sign in, manage profile
- **Dataset submission**: Upload JSON, auto-validate against schema
- **LLM reconciliation**: Compare submitted data against source HTML
- **Admin dashboard**: Manage users, assign roles, review submissions

## 1. Goals

1. Let contractors **submit** one or many JSON records.
2. Run a deterministic **validation pipeline** (structural + semantic checks).
3. **Flag** records with too many nulls / suspicious content for manual review.
4. Produce an **overview report** (counts, error categories, severity).
5. After deterministic checks pass, run an **LLM reconciliation step**:
   fetch the source URL HTML, compare against the submitted JSON, and propose a
   corrected JSON.
6. Surface the diff in a **Git-style review UI** so the human picks the
   authoritative version.

## 2. Architecture

```
┌───────────────────────────┐        ┌──────────────────────────┐
│  Frontend (TanStack)      │ HTTPS  │  Backend (FastAPI · py)  │
│  - Upload                 │ <────► │  /validate               │
│  - Report dashboard       │        │  /llm-review (proxy)     │
│  - Diff viewer            │        │  /report                 │
└─────────────┬─────────────┘        └────────────┬─────────────┘
              │                                   │
              │ server fn (Groq API)              │ http
              ▼                                   ▼
        ┌──────────────┐                   ┌──────────────┐
        │  Groq        │                   │  Source URL  │
        │  (Cloud LLM) │                   │  raw HTML    │
        └──────────────┘                   └──────────────┘
```

- **Frontend** owns UX, calls Python for deterministic checks, and calls a
  TanStack server function (`/api/llm-review`) for the LLM step.
- **Python backend** owns the heavy validation pipeline + HTML extraction.
- **LLM** runs via **Groq** cloud API (`mixtral-8x7b-32768` model). Free tier available.
  Works seamlessly for hosted sites with multiple users.

## 3. Validation Pipeline (Python)

Run in order; later checks only run if earlier ones pass.

| # | Check                | Module                | Severity |
|---|----------------------|-----------------------|----------|
| 1 | Valid JSON parsing   | `checks.json_check`   | fatal    |
| 2 | JSON-Schema (Draft-7)| `checks.schema_check` | fatal    |
| 3 | Type checks          | `checks.types_check`  | error    |
| 4 | Null checks          | `checks.null_check`   | error    |
| 5 | Advanced (URL/regex/qty>=1) | `checks.advanced_check` | error |
| 6 | Enum checks          | `checks.enum_check`   | error    |
| 7 | Unit checks          | `checks.unit_check`   | error    |
| 8 | Null-density flag    | `checks.null_density` | warn     |
| 9 | LLM HTML compare     | `llm.compare`         | review   |

Each check returns a list of `Finding`:

```python
Finding(path="$.suppliers[3].company_name", code="NULL_REQUIRED",
        message="company_name cannot be null", severity="error")
```

### 3.1 Null-density flagging
`null_ratio = nulls / total_fields`. If `null_ratio > 0.4` ⇒ severity=`warn`,
`needs_manual_review=true`.

### 3.2 Unit normalization
`canonical_units = {"length": "meter", "mass": "kilogram", ...}`.
Any deviation (`m`, `mtr`, `kg.`) → error with suggested fix.

### 3.3 LLM compare (step 9)
1. `fetch(source_url)` → strip nav/footer/script (BeautifulSoup).
2. Build prompt: *"Here is raw HTML; here is the extracted JSON. Return a
   corrected JSON and a list of changes."*
3. Force JSON output via schema (`{ "corrected": {...}, "changes": [...] }`).
4. Return both versions to the frontend; UI shows git-diff.

## 4. API Contract

### POST `/validate`
```json
{ "payload": <submitted_json>, "schema_id": "xtrium_supplier_graph_v1" }
```
Response:
```json
{
  "ok": false,
  "summary": { "errors": 3, "warnings": 1, "info": 0, "null_ratio": 0.22 },
  "findings": [Finding, ...],
  "ready_for_llm": false
}
```

### POST `/extract-html`
```json
{ "url": "https://..." }
```
Response: `{ "text": "...", "title": "...", "fetched_at": "..." }`

### POST `/api/llm-review` (TanStack server fn, *not* Python)
```json
{ "submitted": {...}, "html_text": "...", "source_url": "..." }
```
Response:
```json
{ "corrected": {...}, "changes": [{"path":"...","reason":"..."}] }
```

## 5. Repository Layout

```
backend/
  main.py                 FastAPI app
  schemas/
    xtrium_supplier_graph_v1.json
  checks/
    __init__.py
    base.py               Finding dataclass + Severity enum
    json_check.py
    schema_check.py
    types_check.py
    null_check.py
    advanced_check.py
    enum_check.py
    unit_check.py
    null_density.py
  pipeline.py             Orchestrator
  html_extract.py         requests + BeautifulSoup
  report.py               Summary builder
  requirements.txt
  README.md
src/                      Existing TanStack frontend
  routes/
    index.tsx             Upload + dashboard
    review.tsx            Diff viewer
    api/llm-review.ts     Server route → Lovable AI Gateway
  lib/
    validation-api.ts     Calls Python backend
MASTER.md                 This document
```

## 6. Running locally

### Prerequisites
1. **Groq API Key** (free) — Get from https://console.groq.com
   ```bash
   # Sign up and create an API key, then set:
   export GROQ_API_KEY=your_key_here
   ```

### Setup

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (in another terminal)
npm install
npm run dev
```

**Important:** Set `GROQ_API_KEY` environment variable before running. For hosted sites, set this in your deployment platform's environment variables.

## 7. Extending checks

1. Drop a new file in `backend/checks/`.
2. Implement `def run(payload, schema) -> list[Finding]`.
3. Register it in `backend/pipeline.py` `PIPELINE` list.

The pipeline short-circuits on `fatal` severity but otherwise runs every check
so the report is comprehensive in one pass.
