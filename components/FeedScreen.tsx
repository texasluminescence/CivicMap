"use client";

import React, { useState } from "react";
import MiniEventCard from "@/components/MiniEventCard";
import { mockEvents } from "@/lib/mockEvents";
import { useRouter } from "next/navigation";
import SearchAndFilterBar from "./SearchAndFilterBar";
import BottomNav from "@/components/BottomNav";

export default function FeedScreen() {
  const router = useRouter();

  // --- State Hooks ---
  const [events, setEvents] = useState(mockEvents);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "forYou">("all");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTones, setSelectedTones] = useState<string[]>([]);

  const toggleValue = (value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) => {
    setFn((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  // --- Handlers ---
  const handleToggleBookmark = (eventId: string, newState: boolean) => {
    setBookmarkedIds((prev) =>
      newState ? [...prev, eventId] : prev.filter((id) => id !== eventId)
    );
    console.log(`Bookmark toggled for ${eventId}: ${newState}`);
  };

  const handleCardClick = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    localStorage.setItem("selectedEvent", JSON.stringify(event));
    router.push(`/events/${eventId}`);
  };

  // --- Filtered Events ---
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


  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex flex-col md:flex-row justify-center items-center sticky top-0 z-10 gap-2">
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
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredEvents.map((event) => (
              <MiniEventCard
                key={event.id}
                id={event.id}
                title={event.title}
                location={event.location}
                eventDate={event.event_date}
                tags={event.tags}
                imageUrl={event.image_url}
                isBookmarked={bookmarkedIds.includes(event.id)}
                onClick={handleCardClick}
                onToggleSave={handleToggleBookmark}
              />
            ))}
          </div>
        ) : (
          /* Empty State UI */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gray-200 p-6 rounded-full mb-4">
              <span className="text-4xl">🔍</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">No events found</h2>
            <p className="text-gray-500 mt-2">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}
      </main>
      {/* Sticky Bottom Nav */}
      <BottomNav />
    </div>
  );
}
