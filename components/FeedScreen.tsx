"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import MiniEventCard, { Tag } from "./MiniEventCard";
import { CompassIcon, UserIcon } from "./Icons";
import { useRouter } from "next/navigation";
import SearchAndFilterBar from "./SearchAndFilterBar";

interface EventData {
  id: string;
  title: string;
  location: string;
  event_date: string | null;
  description: string;
  image_url?: string;
  category: string | null;
  tone: string | null;
  tags?: Tag[];
}

const formatEventDate = (dateString: string | null): string => {
  if (!dateString) return "Date/Time N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return date.toLocaleString();
  } catch (e) {
    console.error("Failed to parse date:", dateString, e);
    return "Invalid Date";
  }
};

const FeedScreen: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, category, tone, event_date`)
        .order("event_date", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Supabase error:", error.message);
      } else {
        const mappedEvents: EventData[] = (data || []).map((event: any) => {

          const category = event.category || "";

          const toneString = event.tone || "";
          const toneLabels = toneString.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

          const tags: Tag[] = [];

          if (category) {
            tags.push({
              id: 'category',
              label: category,
              type: 'Topic'
            });
          }

          if (toneLabels.length > 0) {
            tags.push({
              id: 'tone',
              label: toneLabels[0],
              type: 'Custom'
            });
          }

          if (tags.length === 0) {
            tags.push({
              id: 'default',
              label: "Community",
              type: 'Topic'
            });
          }

          return {
            ...event,
            tags: tags,
          };
        });

        setEvents(mappedEvents);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <img
          src="/1.png"
          alt="CivicMap Logo - Get Involved"
          className="h-12 w-auto mr-4"
        />

        <SearchAndFilterBar />

      </header>

      <main className="flex-grow p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pb-24 gap-6">
        {events.map((event) => (
          <MiniEventCard
            key={event.id}
            id={event.id}
            title={event.title}
            location={event.location}
            eventDate={formatEventDate(event.event_date)}
            tags={event.tags || [{ label: "Community", type: "Topic" }]}
            imageUrl={event.image_url}
            isBookmarked={false}
            onClick={(id) => router.push(`/events/${id}`)}
          />
        ))}
      </main>

      <nav className="flex w-full justify-around bg-white border-t border-gray-200 py-4 shadow-sm fixed bottom-0">
        <button className="flex flex-col items-center text-blue-700">
          <CompassIcon />
          <span className="text-sm">Explore</span>
        </button>
        <button className="flex flex-col items-center text-gray-500">
          <UserIcon />
          <span className="text-sm">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default FeedScreen;
