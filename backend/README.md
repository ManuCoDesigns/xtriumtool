# Validation Backend (FastAPI)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Endpoints: `POST /validate`, `POST /extract-html`, `GET /schemas`.
See `../MASTER.md` for the contract.