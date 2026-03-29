# ranking_system.py

# ===== MOCK USER DATA =====
MOCK_USERS = {
    "user-budget-fan": {
        "categories": ["Town Hall", "Budget Workshop", "Policy Forum"],
        "tones": ["Formal"],
        "sectors": ["Central"],
        "schedule": ["Weekdays", "Evenings"],
        "format": ["In-Person"]
    },
    "user-arts-lover": {
        "categories": ["Arts & Culture", "Community Festival"],
        "tones": ["Casual"],
        "sectors": ["East", "South"],
        "schedule": ["Weekends"],
        "format": ["In-Person", "Virtual"]
    },
    "user-virtual-only": {
        "categories": ["Policy Forum", "Educational Workshop"],
        "tones": ["Formal", "Casual"],
        "sectors": ["Central", "North"],
        "schedule": ["Weekdays", "Evenings"],
        "format": ["Virtual"]
    }
}

# ===== RANKING FUNCTION =====
def rank_events_for_user(user_id: str, events: list, top_k=5):
    """
    Rank events based on user preferences.
    Each event is a dict with keys: title, category, tone, sector, schedule, format
    """
    prefs = MOCK_USERS.get(user_id)
    if not prefs:
        raise ValueError(f"No preferences found for user_id={user_id}")

    scored = []
    for event in events:
        score = 0.0

        if event.get("category") in prefs["categories"]:
            score += 3.0
        if event.get("tone") in prefs["tones"]:
            score += 1.5
        if event.get("sector") in prefs["sectors"]:
            score += 1.0
        if event.get("schedule") in prefs["schedule"]:
            score += 1.0
        if event.get("format") in prefs["format"]:
            score += 0.5

        scored.append((score, event))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [e for score, e in scored[:top_k]]


# ===== TEST =====
if __name__ == "__main__":
    EVENTS = [
        {"title": "City Budget Town Hall", "category": "Budget Workshop", "tone": "Formal",
         "sector": "Central", "schedule": "Weekdays", "format": "In-Person"},
        {"title": "Arts & Culture Festival", "category": "Arts & Culture", "tone": "Casual",
         "sector": "East", "schedule": "Weekends", "format": "In-Person"},
        {"title": "Virtual Policy Forum", "category": "Policy Forum", "tone": "Formal",
         "sector": "Central", "schedule": "Evenings", "format": "Virtual"},
        {"title": "Neighborhood Listening Session", "category": "Town Hall", "tone": "Formal",
         "sector": "Central", "schedule": "Evenings", "format": "In-Person"},
    ]

    top_events = rank_events_for_user("user-budget-fan", EVENTS)
    print("Top events for user-budget-fan:")
    for e in top_events:
        print(f" - {e['title']} ({e['category']})")
