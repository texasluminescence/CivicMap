"""
Seed test user interactions into Supabase for hybrid model smoke tests.

Creates four GPT-generated synthetic users:
  user-civic-1   – heavy civic interest (views + saves + registrations)
  user-civic-2   – similar civic interest (60-80% overlap expected with civic-1)
  user-arts-1    – arts/culture interest (< 30% overlap with civic users)
  user-new-1     – cold-start user (only 2 views)

Run AFTER seeding events and generating embeddings:
  python ml/seed_user_interactions.py

Env vars required (in .env.local):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client


# Deterministic UUIDs for seed users — same formula used in hybrid_model.py smoke tests.
_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuid.NAMESPACE_URL

def seed_uuid(name: str) -> str:
    return str(uuid.uuid5(_NS, f"civicmap.{name}"))

SEED_USERS = {
    "user-civic-1": seed_uuid("user-civic-1"),
    "user-civic-2": seed_uuid("user-civic-2"),
    "user-arts-1":  seed_uuid("user-arts-1"),
    "user-new-1":   seed_uuid("user-new-1"),
}

load_dotenv(Path(__file__).parent.parent / ".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def ensure_seed_auth_users() -> None:
    """Create seed users in auth.users if they don't already exist."""
    for name, uid in SEED_USERS.items():
        try:
            supabase.auth.admin.create_user({
                "id": uid,
                "email": f"seed.{name}@civicmap.test",
                "password": "SeedUser123!",
                "email_confirm": True,
            })
            print(f"  Created auth user: {name} ({uid})")
        except Exception as e:
            # User already exists or other non-fatal error.
            print(f"  Auth user already exists: {name} ({uid})")


# Weight mapping matches the hybrid model's scale.
WEIGHT = {"view": 0.5, "save": 1.0, "register": 1.5}

CIVIC_KEYWORDS = [
    "town hall", "city council", "budget", "civic", "vote", "election",
    "government", "policy", "community meeting", "public hearing", "planning",
    "zoning", "neighborhood", "municipal", "commissioner", "mayor",
]
ARTS_KEYWORDS = [
    "art", "museum", "gallery", "concert", "theatre", "theater", "dance",
    "film", "festival", "exhibition", "performance", "music", "cultural",
    "poetry", "sculpture", "opera", "craft", "creative",
]


def _score_event(event: dict, keywords: list[str]) -> int:
    text = " ".join([
        (event.get("title") or ""),
        (event.get("description") or ""),
        (event.get("categories") or ""),
    ]).lower()
    return sum(1 for kw in keywords if kw in text)


def fetch_and_categorize() -> tuple[list[dict], list[dict], list[dict]]:
    resp = supabase.table("events").select("id, title, description, categories").execute()
    events = resp.data or []
    if not events:
        raise RuntimeError("No events in DB — run seed_events.py first.")

    civic_scored = sorted(events, key=lambda e: _score_event(e, CIVIC_KEYWORDS), reverse=True)
    arts_scored  = sorted(events, key=lambda e: _score_event(e, ARTS_KEYWORDS), reverse=True)

    civic_events = civic_scored[:max(10, len(events) // 3)]
    arts_events  = arts_scored[:max(10, len(events) // 3)]

    return events, civic_events, arts_events


def _build_interactions(user_id: str, events: list[dict], interaction_plan: list[dict]) -> list[dict]:
    """
    interaction_plan: list of {"event_index": int, "interaction_type": str}
    event_index is index into `events` list.
    """
    rows = []
    for plan in interaction_plan:
        idx = plan["event_index"] % len(events)
        event_id = events[idx]["id"]
        itype = plan["interaction_type"]
        rows.append({
            "user_id": user_id,
            "event_id": event_id,
            "interaction_type": itype,
            "weight": WEIGHT[itype],
        })
    return rows


def _upsert_interactions(rows: list[dict]) -> None:
    if not rows:
        return
    supabase.table("user_interactions").upsert(
        rows,
        on_conflict="user_id,event_id,interaction_type",
    ).execute()


def seed_users(civic_events: list[dict], arts_events: list[dict], all_events: list[dict]) -> None:
    # ── user-civic-1: strong civic interest ─────────────────────────────────────
    civic1_plan = [
        # registrations (highest weight) for first 4 civic events
        *[{"event_index": i, "interaction_type": "register"} for i in range(4)],
        # saves for next 4
        *[{"event_index": i, "interaction_type": "save"} for i in range(4, 8)],
        # views for next 4
        *[{"event_index": i, "interaction_type": "view"} for i in range(8, 12)],
    ]
    rows1 = _build_interactions(SEED_USERS["user-civic-1"], civic_events, civic1_plan)
    _upsert_interactions(rows1)
    print(f"  user-civic-1 ({SEED_USERS['user-civic-1']}): {len(rows1)} interactions inserted")

    # ── user-civic-2: similar civic interest (high overlap with civic-1) ─────────
    civic2_plan = [
        # registrations overlapping with civic-1's saves/views
        *[{"event_index": i, "interaction_type": "register"} for i in range(2, 6)],
        *[{"event_index": i, "interaction_type": "save"} for i in range(6, 10)],
        *[{"event_index": i, "interaction_type": "view"} for i in range(10, 14)],
    ]
    rows2 = _build_interactions(SEED_USERS["user-civic-2"], civic_events, civic2_plan)
    _upsert_interactions(rows2)
    print(f"  user-civic-2 ({SEED_USERS['user-civic-2']}): {len(rows2)} interactions inserted")

    # ── user-arts-1: arts interest, low overlap with civic users ─────────────────
    arts_plan = [
        *[{"event_index": i, "interaction_type": "register"} for i in range(4)],
        *[{"event_index": i, "interaction_type": "save"} for i in range(4, 8)],
        *[{"event_index": i, "interaction_type": "view"} for i in range(8, 12)],
    ]
    rows3 = _build_interactions(SEED_USERS["user-arts-1"], arts_events, arts_plan)
    _upsert_interactions(rows3)
    print(f"  user-arts-1 ({SEED_USERS['user-arts-1']}): {len(rows3)} interactions inserted")

    # ── user-new-1: cold start — only 2 views ────────────────────────────────────
    cold_events = all_events[:2]
    rows4 = [
        {"user_id": SEED_USERS["user-new-1"], "event_id": cold_events[0]["id"], "interaction_type": "view", "weight": 0.5},
        {"user_id": SEED_USERS["user-new-1"], "event_id": cold_events[1]["id"], "interaction_type": "view", "weight": 0.5},
    ]
    _upsert_interactions(rows4)
    print(f"  user-new-1 ({SEED_USERS['user-new-1']}): {len(rows4)} interactions inserted (cold start)")


def verify(user_map: dict[str, str]) -> None:
    print("\nVerifying interaction counts:")
    for name, uid in user_map.items():
        resp = (
            supabase.table("user_interactions")
            .select("id", count="exact")
            .eq("user_id", uid)
            .execute()
        )
        count = resp.count if resp.count is not None else len(resp.data or [])
        print(f"  {name}: {count} interactions")


if __name__ == "__main__":
    print("Fetching and categorizing events...")
    all_events, civic_events, arts_events = fetch_and_categorize()
    print(f"  Total events: {len(all_events)}")
    print(f"  Civic pool:   {len(civic_events)} events")
    print(f"  Arts pool:    {len(arts_events)} events")

    print("\nEnsuring seed auth users exist...")
    ensure_seed_auth_users()

    print("\nSeeding test user interactions...")
    seed_users(civic_events, arts_events, all_events)

    verify(SEED_USERS)

    print("\nDone. Run the hybrid model smoke tests with:")
    print("  python ml/hybrid_model.py")
