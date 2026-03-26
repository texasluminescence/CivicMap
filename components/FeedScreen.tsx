"use client";

import TimelineEventCard from "@/components/TimelineEventCard";
import React, { useEffect, useState } from "react";
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
    tags.push({ id: `cat-${categories}`, label: categories, type: "Topic" });
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
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "forYou">("all");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTones, setSelectedTones] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
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
  }, []);

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

  const handleCardClick = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    localStorage.setItem("selectedEvent", JSON.stringify(event));
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

  const filteredEvents = events.filter((event) => {
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
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex flex-col md:flex-row justify-center items-center sticky top-0 z-50 gap-2">
        <div className="flex items-center">
          <img
            src="/1.png"
            alt="CivicMap Logo"
            className="h-12 w-auto mr-4"
          />
        </div>

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

      {/* Main Content Grid */}
      <main className="p-6">
        {loading ? (
          <p className="text-center text-gray-500 py-20">Loading events...</p>
        ) : filteredEvents.length > 0 ? (
          <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-2">
            <div
              className="hidden md:block absolute top-16 bottom-4 left-1/2 -translate-x-1/2 w-[3px] rounded-full"
              style={{ backgroundColor: "#A6D0E8" }}
            />
            <div
              className="md:hidden absolute top-16 bottom-4 left-4 w-[3px] rounded-full"
              style={{ backgroundColor: "#A6D0E8" }}
            />

            {filteredEvents.map((event, index) => (
              <TimelineEventCard
                key={event.id}
                index={index}
                id={event.id}
                title={event.title}
                location={event.location ?? "Austin, TX"}
                eventDate={formatEventDate(event.event_date)}
                tags={event.tags}
                isBookmarked={bookmarkedIds.includes(event.id)}
                onClick={handleCardClick}
                onToggleSave={handleToggleBookmark}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="text-xl font-semibold text-gray-800">No events found</h2>
            <p className="text-gray-500 mt-2">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
