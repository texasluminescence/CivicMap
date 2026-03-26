"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EventCard from "@/components/EventCard";
import { Tag } from "@/lib/types";
import { ArrowLeftIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";

interface DetailedEvent {
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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    // Try localStorage first (set when clicking from feed)
    const storedEvent = localStorage.getItem("selectedEvent");
    if (storedEvent) {
      const parsed = JSON.parse(storedEvent);
      if (String(parsed.id) === String(id)) {
        setEvent({
          ...parsed,
          tags: parsed.tags ?? buildTags(parsed.categories, parsed.tone),
        });
        setLoading(false);
        return;
      }
    }

    // Fallback: fetch from Supabase
    const supabase = createClient();
    supabase
      .from("events")
      .select("id, title, description, location, event_date, categories, tone")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error("Failed to fetch event:", error?.message);
        } else {
          setEvent({
            ...data,
            tags: buildTags(data.categories, data.tone),
          });
        }
        setLoading(false);
      });
  }, [id]);

  const handleBookmarkToggle = (newState: boolean) => {
    setIsBookmarked(newState);
  };

  if (loading)
    return <p className="p-10 text-gray-500">Loading event details...</p>;

  if (!event)
    return <p className="p-10 text-gray-500">Event not found.</p>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <button
        onClick={() => router.back()}
        className="absolute top-10 left-6 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-20"
        aria-label="Go back"
      >
        <ArrowLeftIcon className="w-6 h-6 text-gray-800" />
      </button>

      <div className="mt-20 w-full flex justify-center p-4">
        <EventCard
          title={event.title}
          location={event.location}
          eventDate={formatEventDate(event.event_date)}
          description={event.description}
          tags={event.tags}
          isBookmarked={isBookmarked}
          eventId={event.id}
          onBookmarkToggle={handleBookmarkToggle}
        />
      </div>

      <BottomNav />
    </div>
  );
}
