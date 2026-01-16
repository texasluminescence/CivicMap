"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EventCard from "@/components/EventCard";
import { Tag } from "@/lib/types";
import { ArrowLeftIcon } from "@/components/Icons";
import { mockEvents } from "@/lib/mockEvents";
import BottomNav from "@/components/BottomNav";

interface DetailedEvent {
  id: string;
  title: string;
  location: string;
  event_date: string | null;
  description: string;
  image_url?: string;
  tags: Tag[];
}

const formatEventDate = (dateString: string | null): string => {
  if (!dateString) return "Date/Time N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString();
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load event either from localStorage (clicked MiniEventCard) or mockEvents
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const storedEvent = localStorage.getItem("selectedEvent");
    if (storedEvent) {
      const parsed: DetailedEvent = JSON.parse(storedEvent);
      if (parsed.id === id) {
        setEvent(parsed);
        setLoading(false);
        return;
      }
    }

    // fallback: search in mockEvents
    const fallbackEvent = mockEvents.find((e) => e.id === id);
    if (fallbackEvent) {
      setEvent(fallbackEvent);
    }

    setLoading(false);
  }, [id]);

  // Async bookmark toggle
  const handleBookmarkToggle = async (newState: boolean) => {
    setIsBookmarked(newState);
    console.log(
      `Bookmark status locally toggled to: ${newState} for event ID: ${event?.id}`
    );
    // Optional: simulate API call
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  if (loading || !event)
    return <p className="p-10 text-gray-500">Loading event details...</p>;

  const formattedEventDate = formatEventDate(event.event_date);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-10 left-6 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-20"
        aria-label="Go back"
      >
        <ArrowLeftIcon className="w-6 h-6 text-gray-800" />
      </button>

      {/* EventCard */}
      <div className="mt-20 w-full flex justify-center p-4">
        <EventCard
          title={event.title}
          location={event.location}
          eventDate={formattedEventDate}
          description={event.description}
          tags={event.tags}
          imageUrl={event.image_url ?? undefined}
          isBookmarked={isBookmarked}
          eventId={event.id}
          onBookmarkToggle={handleBookmarkToggle} // async function
        />
      </div>

      <BottomNav />
    </div>
  );
}
