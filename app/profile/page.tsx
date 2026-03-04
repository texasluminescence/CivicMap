"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";

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
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? "");
        setFullName(user.user_metadata?.full_name ?? "");
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <header className="bg-white shadow-md px-6 py-6 flex items-center gap-4 sticky top-0 z-10">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
          <UserIcon className="w-8 h-8" />
        </div>

        <div className="flex flex-col">
          <span className="font-semibold text-lg">{fullName || "User"}</span>
          <span className="text-gray-500 text-sm">{email}</span>
        </div>

        <button
          onClick={handleLogout}
          className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </header>

      <main className="flex flex-col gap-8 px-6 mt-6">
        {/* Preferences Section */}
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

        {/* Saved Events Section */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-gray-900">Saved Events</h2>
          <p className="text-gray-500">You haven't saved any events yet.</p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
