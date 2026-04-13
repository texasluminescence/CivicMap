"use client";

import React, { useEffect, useMemo, useState } from "react";
import MiniEventCard from "@/components/MiniEventCard";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import SearchAndFilterBar from "./SearchAndFilterBar";
import BottomNav from "@/components/BottomNav";
import { Tag } from "@/lib/types";

interface EventData {
  id: string;
  title: string;
  location: string;
  event_date: string | null;
  description: string;
  categories: string | null;
  tone: string | null;
  tags: Tag[];
}

function buildTags(categories: string | null, tone: string | null): Tag[] {
  const tags: Tag[] = [];

  if (categories) {
    categories.split(",").forEach((c, i) => {
      const trimmed = c.trim();
      if (trimmed) {
        tags.push({ id: `cat-${i}-${trimmed}`, label: trimmed, type: "Topic" });
      }
    });
  }

  if (tone) {
    tone.split(",").forEach((t, i) => {
      const trimmed = t.trim();
      if (trimmed) {
        tags.push({ id: `tone-${i}-${trimmed}`, label: trimmed, type: "Tone" });
      }
    });
  }

  return tags;
}

const formatEventDate = (dateString: string | null): string => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function FeedScreen() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<EventData[]>([]);
  const [forYouEvents, setForYouEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "forYou">("all");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTones, setSelectedTones] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, description, location, event_date, categories, tone")
      .order("event_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch events:", error.message);
        } else {
          const mapped: EventData[] = (data ?? []).map((e) => ({
            ...e,
            tags: buildTags(e.categories, e.tone),
          }));
          setEvents(mapped);
        }
        setLoading(false);
      });
  }, [supabase]);

  useEffect(() => {
    if (activeTab !== "forYou" || forYouEvents.length > 0) return;
    setForYouLoading(true);
    fetch("/api/recommendations?n=20")
      .then((r) => r.json())
      .then((data) => {
        const recs: EventData[] = (data.recommendations ?? [])
          .map((r: { event: Record<string, unknown> | null }) => {
            const e = r.event;
            if (!e) return null;
            return {
              id: String(e.id),
              title: String(e.title ?? ""),
              location: String(e.location ?? ""),
              event_date: (e.event_date as string) ?? null,
              description: String(e.description ?? ""),
              categories: (e.categories as string) ?? null,
              tone: (e.tone as string) ?? null,
              tags: buildTags((e.categories as string) ?? null, (e.tone as string) ?? null),
            };
          })
          .filter(Boolean);
        setForYouEvents(recs);
      })
      .catch(() => {})
      .finally(() => setForYouLoading(false));
  }, [activeTab, forYouEvents.length]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setBookmarkedIds(data.map((d) => d.event_id));
        });

      supabase
        .from("registered_events")
        .select("event_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setRegisteredIds(data.map((d) => d.event_id));
        });
    });
  }, [supabase]);

  const toggleValue = (value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) => {
    setFn((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleToggleBookmark = (eventId: string, newState: boolean) => {
    setBookmarkedIds((prev) =>
      newState ? [...prev, eventId] : prev.filter((id) => id !== eventId)
    );
  };

  const handleToggleRegister = (eventId: string, newState: boolean) => {
    setRegisteredIds((prev) =>
      newState ? [...prev, eventId] : prev.filter((id) => id !== eventId)
    );
  };

  const handleCardClick = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  const topicTags = React.useMemo(() => {
    return Array.from(
      new Set(
        events.flatMap((e) =>
          e.tags.filter((t) => t.type === "Topic").map((t) => t.label)
        )
      )
    );
  }, [events]);

  const toneTags = React.useMemo(() => {
    return Array.from(
      new Set(
        events.flatMap((e) =>
          e.tags.filter((t) => t.type === "Tone").map((t) => t.label)
        )
      )
    );
  }, [events]);

  const activeEvents = activeTab === "forYou" ? forYouEvents : events;

  const filteredEvents = activeEvents.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());

    const eventTopics = event.tags
      .filter((t) => t.type === "Topic")
      .map((t) => t.label);

    const eventTones = event.tags
      .filter((t) => t.type === "Tone")
      .map((t) => t.label);

    const matchesTopics =
      selectedTopics.length === 0 ||
      selectedTopics.every((t) => eventTopics.includes(t));

    const matchesTones =
      selectedTones.length === 0 ||
      selectedTones.every((t) => eventTones.includes(t));

    return matchesSearch && matchesTopics && matchesTones;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md px-4 py-3 flex flex-col md:flex-row justify-center items-center sticky top-0 z-10 gap-2">
        <img
          src="/1.png"
          alt="CivicMap Logo"
          className="h-12 w-auto"
        />

        <SearchAndFilterBar
          searchQuery={searchQuery}
          activeTab={activeTab}
          topicTags={topicTags}
          toneTags={toneTags}
          selectedTopics={selectedTopics}
          selectedTones={selectedTones}
          onSearchChange={setSearchQuery}
          onTabChange={setActiveTab}
          onTopicToggle={(tag) => toggleValue(tag, setSelectedTopics)}
          onToneToggle={(tag) => toggleValue(tag, setSelectedTones)}
        />
      </header>

      <main className="p-6 pb-24">
        {(activeTab === "all" ? loading : forYouLoading) ? (
          <p className="text-center text-gray-500 py-20">Loading events...</p>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredEvents.map((event) => (
              <MiniEventCard
                key={event.id}
                id={event.id}
                title={event.title}
                location={event.location ?? "Austin, TX"}
                eventDate={formatEventDate(event.event_date)}
                tags={event.tags}
                isBookmarked={bookmarkedIds.includes(event.id)}
                isRegistered={registeredIds.includes(event.id)}
                onClick={handleCardClick}
                onToggleSave={handleToggleBookmark}
                onToggleRegister={handleToggleRegister}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {activeTab === "forYou" ? "No recommendations yet" : "No events found"}
            </h2>
            <p className="text-gray-500 mt-2">
              {activeTab === "forYou"
                ? "Interact with a few events to get personalized recommendations."
                : "Try adjusting your search or filters to find what you're looking for."}
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
