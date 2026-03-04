"use client";

import React, { useEffect, useState } from "react";
import MiniEventCard from "@/components/MiniEventCard";
import { useRouter } from "next/navigation";
import { Tag } from "@/lib/types";
import { getTagClasses } from "@/lib/tagColors";
import BottomNav from "@/components/BottomNav";

// Dummy types
interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

interface SavedEvent {
  id: string;
  title: string;
  location: string;
  event_date: string;
  description: string;
  tags: Tag[];
  image_url?: string;
}

// Dummy mock events for saved events
const mockSavedEvents: SavedEvent[] = [
  {
    id: "1",
    title: "Community Cleanup Day",
    location: "Riverfront Park",
    event_date: "2026-02-10 10:00:00",
    description:
      "Join your neighbors for a hands-on community cleanup to protect local waterways and public spaces.",
    image_url: "/events/cleanup.jpg",
    tags: [
      { id: "t1", label: "Action-Oriented", type: "Tone" },
      { id: "t2", label: "Environment", type: "Topic" },
    ],
  },
  {
    id: "2",
    title: "City Council Public Forum",
    location: "Downtown City Hall",
    event_date: "2026-02-12 18:30:00",
    description:
      "Meet city officials and discuss upcoming legislation and community priorities.",
    image_url: "/events/council.jpg",
    tags: [
      { id: "t3", label: "Procedural", type: "Tone" },
      { id: "t4", label: "Civic", type: "Topic" },
    ],
  },
  // Add more events as needed...
];

export default function ProfilePage() {
  const router = useRouter();

  // Dummy user
  const [user, setUser] = useState<UserProfile>({
    id: "user123",
    email: "user@example.com",
    fullName: "John Doe",
    avatarUrl: "/mock/avatar.png",
  });

  // Saved events (dummy data for now)
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>(mockSavedEvents);

  const handleLogout = () => {
    // Placeholder: call backend logout endpoint
    console.log("Logging out...");
    router.push("/auth"); // redirect to auth page
  };

  const handleToggleBookmark = (id: string, newState: boolean) => {
    // Dummy toggle: remove from savedEvents if un-bookmarked
    setSavedEvents((prev) =>
      newState ? prev : prev.filter((event) => event.id !== id)
    );

    // Placeholder: call backend API to save/remove bookmark
    console.log(`Toggling bookmark for ${id}: ${newState}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      {/* Profile Header */}
      <header className="bg-white shadow-md px-6 py-6 flex items-center gap-4 sticky top-0 z-10">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
            {user.fullName ? user.fullName.charAt(0) : "U"}
          </div>
        )}

        <div className="flex flex-col">
          <span className="font-semibold text-lg">{user.fullName}</span>
          <span className="text-gray-500 text-sm">{user.email}</span>
        </div>

        <button
          onClick={handleLogout}
          className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </header>

      {/* Saved Events */}
      <main className="flex flex-col gap-6 px-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900">Saved Events</h2>

        {savedEvents.length === 0 ? (
          <p className="text-gray-500">You haven’t saved any events yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {savedEvents.map((event) => (
              <MiniEventCard
                key={event.id}
                id={event.id}
                title={event.title}
                location={event.location}
                eventDate={event.event_date}
                tags={event.tags}
                imageUrl={event.image_url}
                isBookmarked={true}
                onClick={() => router.push(`/events/${event.id}`)}
                onToggleSave={handleToggleBookmark}
              />
            ))}
          </div>
        )}
      </main>
      {/* Sticky Bottom Nav */}
      <BottomNav />
    </div>
  );
}
