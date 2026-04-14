"""
CivicMap — Weight Comparison Evaluation Script
ml/generate_evaluation_report.py

Tests hybrid model at four weight configurations and documents
recommendation quality for standup/demo evidence.

Weight configs tested:
  - content_only:  (1.0, 0.0)
  - balanced_70_30: (0.7, 0.3)  ← current default
  - balanced_60_40: (0.6, 0.4)
  - balanced_50_50: (0.5, 0.5)

Usage:
    python ml/generate_evaluation_report.py

Output: ml/model/evaluation_report.txt (overwrites existing)
Requires: collab_model.pkl (run retrain_model.py first)
"""
from __future__ import annotations

import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

ML_DIR = Path(__file__).parent
MODEL_PATH = ML_DIR / "model" / "collab_model.pkl"
REPORT_PATH = ML_DIR / "model" / "evaluation_report.txt"

sys.path.insert(0, str(ML_DIR))

import hybrid_model  # noqa: E402

WEIGHT_CONFIGS: list[tuple[str, float, float]] = [
    ("content_only (1.0 / 0.0)", 1.0, 0.0),
    ("hybrid_70_30 (0.7 / 0.3)", 0.7, 0.3),
    ("hybrid_60_40 (0.6 / 0.4)", 0.6, 0.4),
    ("hybrid_50_50 (0.5 / 0.5)", 0.5, 0.5),
]

N = 10  # Recommendations per user per config


def load_model() -> None:
    if MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            saved = pickle.load(f)
        hybrid_model._model = saved["model"]
        hybrid_model._trainset = saved["trainset"]
        hybrid_model._interactions_df = saved["interactions_df"]
        print(f"Loaded cached model from {MODEL_PATH}")
    else:
        print("No cached model found — training from scratch (may take ~30s)...")
        hybrid_model.refresh_model()


def get_recs_with_weights(
    user_id: str,
    content_w: float,
    collab_w: float,
    n: int,
) -> list[dict]:
    """Get recommendations with fixed weights, bypassing adaptive logic."""
    original_fn: Callable = hybrid_model._pick_hybrid_weights

    def _fixed_weights(uid: str, collab_available: bool) -> tuple[float, float, str]:
        return content_w, collab_w, f"forced_{content_w:.1f}_{collab_w:.1f}"

    hybrid_model._pick_hybrid_weights = _fixed_weights  # type: ignore[assignment]
    try:
        return hybrid_model.get_hybrid_recommendations(user_id, n=n)
    finally:
        hybrid_model._pick_hybrid_weights = original_fn  # type: ignore[assignment]


def run_evaluation() -> str:
    load_model()

    lines: list[str] = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines.append("=" * 70)
    lines.append("  CivicMap Hybrid Model — Weight Comparison Evaluation")
    lines.append(f"  Generated: {now}")
    lines.append("=" * 70)
    lines.append("")
    lines.append("Seed users:")
    for label, uid in hybrid_model.SEED_USERS.items():
        lines.append(f"  {label:<20} {uid}")
    lines.append("")

    # Collect all results: { config_label: { user_label: [event_ids] } }
    all_results: dict[str, dict[str, list[int]]] = {}
    all_event_ids: set[int] = set()

    for config_label, content_w, collab_w in WEIGHT_CONFIGS:
        all_results[config_label] = {}
        for user_label, user_id in hybrid_model.SEED_USERS.items():
            recs = get_recs_with_weights(user_id, content_w, collab_w, N)
            all_results[config_label][user_label] = [r["event_id"] for r in recs]
            all_event_ids.update(r["event_id"] for r in recs)
            # Store full rec objects for score display
            all_results[config_label][f"_recs_{user_label}"] = recs  # type: ignore[assignment]

    # Fetch titles once
    titles = hybrid_model._get_event_titles(list(all_event_ids))

    # ── Per-config breakdown ───────────────────────────────────────────────────
    for config_label, content_w, collab_w in WEIGHT_CONFIGS:
        lines.append("=" * 70)
        lines.append(f"  CONFIG: {config_label}")
        lines.append("=" * 70)

        config_data = all_results[config_label]

        for user_label in hybrid_model.SEED_USERS:
            recs: list[dict] = config_data[f"_recs_{user_label}"]  # type: ignore[assignment]
            lines.append(f"\n  [{user_label}]")
            lines.append(f"  {'Rank':<5} {'Score':<8} {'Content':<10} {'Collab':<10} Title")
            lines.append("  " + "-" * 62)
            for i, r in enumerate(recs, 1):
                title = titles.get(r["event_id"], f"event {r['event_id']}")[:40]
                lines.append(
                    f"  {i:<5} {r['score']:<8.3f} "
                    f"{r.get('content_score', 0.0):<10.3f} "
                    f"{r.get('collab_score', 0.0):<10.3f} "
                    f"{title}"
                )

        # Cross-user overlap at this config
        lines.append("")
        lines.append("  Overlap between users at this config:")
        user_labels = list(hybrid_model.SEED_USERS.keys())
        for i, u1 in enumerate(user_labels):
            for u2 in user_labels[i + 1:]:
                ids1 = config_data[u1]
                ids2 = config_data[u2]
                overlap = hybrid_model._overlap_ratio(ids1, ids2)
                flag = "✓ (good diff)" if overlap < 0.3 else ("~ (some overlap)" if overlap < 0.6 else "✗ (high overlap)")
                lines.append(f"    {u1} vs {u2}: {overlap:.0%}  {flag}")
        lines.append("")

    # ── Weight shift analysis ─────────────────────────────────────────────────
    lines.append("=" * 70)
    lines.append("  WEIGHT SHIFT ANALYSIS")
    lines.append("  How many top-5 recommendations change between configs?")
    lines.append("=" * 70)
    lines.append("")

    config_labels = [c[0] for c in WEIGHT_CONFIGS]
    for user_label in hybrid_model.SEED_USERS:
        lines.append(f"  [{user_label}]")
        for i in range(len(config_labels) - 1):
            a_label, b_label = config_labels[i], config_labels[i + 1]
            a_top5 = set(all_results[a_label][user_label][:5])
            b_top5 = set(all_results[b_label][user_label][:5])
            changed = len(a_top5.symmetric_difference(b_top5)) // 2
            lines.append(f"    {a_label} → {b_label}: {changed}/5 events changed")
        lines.append("")

    # ── Standup examples ──────────────────────────────────────────────────────
    lines.append("=" * 70)
    lines.append("  STANDUP EXAMPLES")
    lines.append("  Content-only vs Hybrid (70/30) for each user")
    lines.append("=" * 70)
    lines.append("")

    content_label = config_labels[0]
    hybrid_label = config_labels[1]

    for user_label in hybrid_model.SEED_USERS:
        content_ids = all_results[content_label][user_label]
        hybrid_ids = all_results[hybrid_label][user_label]

        content_only_events = [titles.get(eid, str(eid)) for eid in content_ids[:5]]
        hybrid_events = [titles.get(eid, str(eid)) for eid in hybrid_ids[:5]]
        collab_boosted = [t for eid, t in zip(hybrid_ids[:5], hybrid_events)
                         if eid not in set(content_ids[:5])]

        lines.append(f"  {user_label}:")
        lines.append(f"    Content-only top 5: {content_only_events}")
        lines.append(f"    Hybrid 70/30 top 5: {hybrid_events}")
        lines.append(f"    Collab-boosted in (events new to top 5): {collab_boosted or ['(no change)']}")
        lines.append("")

    lines.append("=" * 70)
    lines.append("  END OF REPORT")
    lines.append("=" * 70)

    return "\n".join(lines)


if __name__ == "__main__":
    report = run_evaluation()
    print(report)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report)
    print(f"\nReport written to {REPORT_PATH}")
