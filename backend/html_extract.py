"""Fetch a URL and return cleaned text + title."""
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup


def extract(url: str, timeout: int = 15, max_chars: int = 60_000) -> dict:
    r = requests.get(url, timeout=timeout, headers={
        "User-Agent": "XtriumValidator/1.0 (+https://xtrium.example)"
    })
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript", "nav", "footer", "header"]):
        tag.decompose()
    title = (soup.title.string.strip() if soup.title and soup.title.string else "")
    text = " ".join(soup.get_text(" ").split())[:max_chars]
    return {
        "title": title,
        "text": text,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source_url": url,
    }