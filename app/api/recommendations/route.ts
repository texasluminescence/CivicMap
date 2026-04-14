import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StoredRec = {
  event_id: number;
  score: number;
  reason: string;
  content_score: number;
  collab_score: number;
  weights: { content: number; collab: number; mode: string };
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.user.id;
  const { searchParams } = new URL(request.url);
  const n = Math.min(50, Math.max(1, parseInt(searchParams.get("n") ?? "20")));

  // ── Read pre-computed recommendations from Supabase ───────────────────────
  const { data: row, error: dbError } = await supabase
    .from("recommendations")
    .select("recommendations, updated_at")
    .eq("user_id", userId)
    .single();

  if (dbError || !row) {
    // No pre-computed recs yet for this user — return empty (not an error)
    return NextResponse.json({ recommendations: [], user_id: userId });
  }

  const rawRecs: StoredRec[] = (row.recommendations ?? []).slice(0, n);

  if (rawRecs.length === 0) {
    return NextResponse.json({ recommendations: [], user_id: userId });
  }

  // ── Enrich with full event details from Supabase ──────────────────────────
  const eventIds = rawRecs.map((r) => r.event_id);

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, description, categories, event_date, location, event_url, is_virtual, tone, sector"
    )
    .in("id", eventIds);

  const eventsById = Object.fromEntries(
    (events ?? []).map((e) => [e.id, e])
  );

  const recommendations = rawRecs.map((rec) => ({
    ...rec,
    event: eventsById[rec.event_id] ?? null,
  }));

  return NextResponse.json({
    recommendations,
    user_id: userId,
    computed_at: row.updated_at,
  });
}
