import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import csv from "csv-parser";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const events = [];

fs.createReadStream("./backend/finalCSV.csv")
  .pipe(csv({ separator: "," }))
  .on("data", (row) => {
    const categories = row.categories
      ? row.categories.split(",").map((c) => c.trim())
      : [];

    events.push({
      title: row.title,
      description: row.description || null,
      event_date: row.event_date,
      location: row.location || null,
      event_url: row.event_url || null,
      tone: row.tone,
      source: row.source || null,
      categories,
    });
  })
  .on("end", async () => {
    console.log(`Parsed ${events.length} events from CSV...`);

    const { data: inserted, error } = await supabase
      .from("events")
      .insert(
        events.map((e) => ({
          title: e.title,
          description: e.description,
          event_date: e.event_date,
          location: e.location,
          event_url: e.event_url,
          tone: e.tone,
          source: e.source,
        }))
      )
      .select("id, title");

    if (error) {
      console.error("Error inserting events:", error);
      return;
    }

    console.log(`Inserted ${inserted.length} events.`);
  });
