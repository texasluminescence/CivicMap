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
  const supabase = createClient();

  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false); // New state for registration persistence
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initPage = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // 1. Fetch User and Event Data
        const [userResponse, eventResponse] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("events")
            .select("id, title, description, location, event_date, categories, tone")
            .eq("id", id)
            .single(),
        ]);

        const user = userResponse.data.user;
        const eventData = eventResponse.data;

        if (eventData) {
          setEvent({
            ...eventData,
            tags: buildTags(eventData.categories, eventData.tone),
          });

          // 2. Check Persisted States (Saved & Registered)
          if (user) {
            const [savedCheck, registeredCheck] = await Promise.all([
              supabase
                .from("saved_events")
                .select("event_id")
                .match({ user_id: user.id, event_id: id })
                .maybeSingle(),
              supabase
                .from("registered_events")
                .select("event_id")
                .match({ user_id: user.id, event_id: id })
                .maybeSingle(),
            ]);

            if (savedCheck.data) setIsBookmarked(true);
            if (registeredCheck.data) setIsRegistered(true);
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [id, supabase]);

  if (loading)
    return <p className="p-10 text-gray-500 text-center">Loading event details...</p>;

  if (!event)
    return <p className="p-10 text-gray-500 text-center">Event not found.</p>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <button
        onClick={() => router.back()}
        className="absolute top-10 left-6 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-20"
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
          isBookmarked={isBookmarked}
          initialRegistered={isRegistered} // We'll need to update EventCard to accept this
          onBookmarkToggle={(newState) => setIsBookmarked(newState)}
        />
      </div>

      <BottomNav />
    </div>
  );
}