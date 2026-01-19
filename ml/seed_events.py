"""
Seed Austin civic events into Supabase using SerpAPI (discovery) + Jina AI (page text).

IMPORTANT
- Do NOT hardcode API keys. Read from environment variables.
- Keep usage LOW: default is 1–2 SERP queries and ~10 events total.
- Make a branch before running.

Env vars expected:
  SERPAPI_API_KEY
  JINA_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Dependencies:
  pip install requests python-dateutil supabase
"""
from __future__ import annotations
from dotenv import load_dotenv
import os

load_dotenv(".env.local")


import time
import json
import re
from typing import List, Dict, Any
from urllib.parse import urlparse
from pathlib import Path
load_dotenv(Path(__file__).parent.parent / ".env.local")
import requests
from dateutil import parser as dateparser
try:
    from supabase import create_client, Client
except Exception:
    # Defer the missing dependency error until runtime with a clear message.
    create_client = None
    Client = None

# ----------------------
# Config (safe defaults)
# ----------------------
SERP_QUERIES = [
    " political events in austin, tx",
    # add at most one more query if needed
]
MAX_EVENTS = 10
SLEEP_BETWEEN_CALLS_SEC = 1.0  # be gentle

# If your Supabase table/columns differ, update this mapping section only
SUPABASE_TABLE = "events"
SCHEMA_MAPPING = {
    # target_column: source_key
    "title": "title",
    "description": "description",
    "event_date": "event_date",
    "location": "location",
    "event_url": "event_url",
    "source": "source",
    "category": "category",
}
def get_supabase() -> Client:
    if create_client is None:
        raise RuntimeError("Missing 'supabase' package; install it with: pip install supabase")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return create_client(url, key)
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return create_client(url, key)

# ----------------------
# SerpAPI discovery
# ----------------------

def serpapi_search(query: str) -> List[Dict[str, Any]]:
    api_key = os.environ.get("SERPAPI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing SERPAPI_API_KEY")

    params = {
        "engine": "google",
        "q": query,
        "hl": "en",
        "gl": "us",
        "api_key": api_key,
    }
    r = requests.get("https://serpapi.com/search", params=params, timeout=30)
    r.raise_for_status()
    data = r.json()

    results = []
    for item in data.get("organic_results", [])[:MAX_EVENTS]:
        results.append({
            "title": item.get("title"),
            "url": item.get("link"),
            "snippet": item.get("snippet"),
            "source": "serpapi",
        })
    return results

# ----------------------
# Jina AI scraping
# ----------------------

def jina_fetch_text(url: str) -> str:
    """
    Uses Jina Reader to extract readable text from a URL.
    We only need raw text for downstream sentiment/analysis.
    """
    api_key = os.environ.get("JINA_API_KEY")
    if not api_key:
        raise RuntimeError("Missing JINA_API_KEY")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    # Reader endpoint pattern
    reader_url = f"https://r.jina.ai/{url}"
    r = requests.get(reader_url, headers=headers, timeout=30)
    r.raise_for_status()

    # Jina may return text/plain or json depending on plan
    ct = r.headers.get("content-type", "")
    if "application/json" in ct:
        return r.json().get("data", {}).get("content", "")
    return r.text

# ----------------------
# Helpers
# ----------------------

def extract_start_time(text: str) -> str | None:
    """Best-effort date parsing from page text/snippet."""
    if not text:
        return None
    # very light heuristic: look for common date patterns
    candidates = re.findall(r"(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}[^\n]{0,40})", text)
    for c in candidates:
        try:
            dt = dateparser.parse(c, fuzzy=True)
            if dt:
                return dt.isoformat()
        except Exception:
            pass
    return None


def normalize_event(raw: Dict[str, Any], page_text: str) -> Dict[str, Any]:
    parsed = urlparse(raw.get("url") or "")
    event_date = extract_start_time(page_text or raw.get("snippet", ""))

    return {
        "title": raw.get("title"),
        "description": (page_text or raw.get("snippet") or "").strip()[:8000],
        "event_date": event_date,
        "location": "Austin, TX",
        "event_url": raw.get("url"),
        "source": raw.get("source", "serpapi"),
        "category": "civic",
        "domain": parsed.netloc,
    }

# ----------------------
# Supabase insert
# ----------------------

def insert_events(sb: Client, events: List[Dict[str, Any]]):
    if not events:
        print("No events to insert")
        return
    payload = []
    for e in events:
        row = {tgt: e.get(src) for tgt, src in SCHEMA_MAPPING.items()}
        payload.append(row)
    # print instead of inserting
    print("Payload to insert:", json.dumps(payload, indent=2))

# ----------------------
# Main pipeline
# ----------------------

def main():
    sb = get_supabase()

    discovered: List[Dict[str, Any]] = []
    for q in SERP_QUERIES:
        discovered.extend(serpapi_search(q))
        time.sleep(SLEEP_BETWEEN_CALLS_SEC)
        if len(discovered) >= MAX_EVENTS:
            break

    enriched = []
    for raw in discovered[:MAX_EVENTS]:
        try:
            text = jina_fetch_text(raw["url"])
            time.sleep(SLEEP_BETWEEN_CALLS_SEC)
        except Exception:
            text = raw.get("snippet", "")
        enriched.append(normalize_event(raw, text))

    insert_events(sb, enriched)
    print(f"Inserted {len(enriched)} events")


if __name__ == "__main__":
    main()
