"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import MiniEventCard, { Tag } from "@/components/MiniEventCard";
import { CompassIcon, UserIcon } from "@/components/Icons";

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
];

const preferenceCategories = [
  {
    id: "topics",
    title: "Topics",
    description: "Select civic topics you care about.",
  },
  {
    id: "styles",
    title: "Styles",
    description: "Choose the vibe you want for events.",
  },
  {
    id: "formats",
    title: "Formats",
    description: "Pick how you want to participate.",
  },
  {
    id: "locations",
    title: "Locations",
    description: "Set preferred neighborhoods or travel radius.",
  },
  {
    id: "times",
    title: "Times",
    description: "Define your ideal dates and time windows.",
  },
];

export default function ProfilePage() {
  const router = useRouter();

  const [user] = useState<UserProfile>({
    id: "user123",
    email: "user@example.com",
    fullName: "John Doe",
    avatarUrl: "/mock/avatar.png",
  });

  const [savedEvents] = useState<SavedEvent[]>(mockSavedEvents);

  const handleLogout = () => {
    console.log("Logging out...");
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
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

      <main className="flex flex-col gap-8 px-6 mt-6">
        <section className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Preferences</h2>
              <p className="text-sm text-gray-500">
                Personalize what shows up in your feed.
              </p>
            </div>
            <button className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preferenceCategories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2"
              >
                <span className="font-semibold text-gray-900">
                  {category.title}
                </span>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
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
                  colorScheme="neutral"
                  isBookmarked={true}
                  onClick={() => router.push(`/events/${event.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <nav className="flex w-full justify-around bg-white border-t border-gray-200 py-4 shadow-sm fixed bottom-0">
        <button
          onClick={() => router.push("/")}
          className="flex flex-col items-center text-gray-500"
        >
          <CompassIcon />
          <span className="text-sm">Explore</span>
        </button>
        <button className="flex flex-col items-center text-blue-700">
          <UserIcon />
          <span className="text-sm">Profile</span>
        </button>
      </nav>
    </div>
  );
}
