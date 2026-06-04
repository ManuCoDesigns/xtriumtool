"""FastAPI entrypoint."""
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pipeline import run_pipeline
from html_extract import extract

app = FastAPI(title="Xtrium Dataset Validator", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEMA_DIR = Path(__file__).parent / "schemas"


def load_schema(schema_id: str) -> dict:
    p = SCHEMA_DIR / f"{schema_id}.json"
    if not p.exists():
        raise HTTPException(404, f"Unknown schema_id: {schema_id}")
    return json.loads(p.read_text())


class ValidateReq(BaseModel):
    payload: Any
    schema_id: str | None = None


class ExtractReq(BaseModel):
    url: str


@app.get("/schemas")
def list_schemas():
    return {"schemas": [p.stem for p in SCHEMA_DIR.glob("*.json")]}


@app.post("/validate")
def validate(req: ValidateReq):
    schema = load_schema(req.schema_id) if req.schema_id else None
    return run_pipeline(req.payload, schema)


@app.post("/extract-html")
def extract_html(req: ExtractReq):
    try:
        return extract(req.url)
    except Exception as e:
        raise HTTPException(502, f"Fetch failed: {e}")


@app.get("/")
def root():
    return {"service": "xtrium-validator", "status": "ok"}