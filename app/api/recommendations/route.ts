import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

import { createClient } from "@/lib/supabase/server";

function getPythonExe(): string {
  const venvPython = path.join(
    process.cwd(),
    ".venv311",
    "Scripts",
    "python.exe"
  );
  return fs.existsSync(venvPython) ? venvPython : "python";
}

type RawRec = {
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
  const n = Math.min(50, Math.max(1, parseInt(searchParams.get("n") ?? "10")));

  const scriptPath = path.join(process.cwd(), "ml", "get_recommendations.py");

  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json(
      { error: "Recommendation script not found" },
      { status: 500 }
    );
  }

  // ── Run the Python hybrid model ────────────────────────────────────────────
  const rawRecs = await new Promise<RawRec[] | null>((resolve) => {
    const child = spawn(getPythonExe(), [scriptPath, userId, String(n)], {
      cwd: path.join(process.cwd(), "ml"),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));

    child.on("close", (code: number | null) => {
      if (code !== 0) {
        console.error("[recommendations] Python process failed:\n", stderr);
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        console.error("[recommendations] Bad Python output:\n", stdout);
        resolve(null);
      }
    });

    child.on("error", (err: Error) => {
      console.error("[recommendations] Spawn error:", err.message);
      resolve(null);
    });
  });

  if (!rawRecs) {
    return NextResponse.json(
      { error: "Recommendation engine failed" },
      { status: 500 }
    );
  }

  if (rawRecs.length === 0) {
    return NextResponse.json({ recommendations: [], user_id: userId });
  }

  // ── Enrich with full event details from Supabase ───────────────────────────
  const eventIds = rawRecs.map((r) => r.event_id);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, categories, event_date, location, event_url, is_virtual, tone, sector")
    .in("id", eventIds);

  const eventsById = Object.fromEntries(
    (events ?? []).map((e) => [e.id, e])
  );

  const recommendations = rawRecs.map((rec) => ({
    ...rec,
    event: eventsById[rec.event_id] ?? null,
  }));

  return NextResponse.json({ recommendations, user_id: userId });
}
