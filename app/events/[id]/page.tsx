"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        const [{ data: { user } }, { data, error }] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("events")
            .select("id, title, description, location, event_date, categories, tone")
            .eq("id", id)
            .single(),
        ]);

        if (error || !data) {
          console.error("Failed to fetch event:", error?.message);
          setLoading(false);
          return;
        }

        setEvent({
          ...data,
          tags: buildTags(data.categories, data.tone),
        });

        if (user) {
          const [{ data: saved }, { data: registered }] = await Promise.all([
            supabase
              .from("saved_events")
              .select("id")
              .eq("user_id", user.id)
              .eq("event_id", id)
              .maybeSingle(),
            supabase
              .from("registered_events")
              .select("id")
              .eq("user_id", user.id)
              .eq("event_id", id)
              .maybeSingle(),
          ]);
          setIsBookmarked(!!saved);
          setIsRegistered(!!registered);
        }
      } catch (err) {
        console.error("Error loading event:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, supabase]);

  if (loading)
    return <p className="p-10 text-gray-500 text-center">Loading event details...</p>;

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
          eventId={event.id}
          title={event.title}
          location={event.location}
          eventDate={formatEventDate(event.event_date)}
          description={event.description}
          tags={event.tags}
          onBookmarkToggle={(newState: boolean) => setIsBookmarked(newState)}
          onRegisterToggle={(newState) => setIsRegistered(newState)}
        />
      </div>

      <BottomNav />
    </div>
  );
}
