"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";

interface PreferenceSection {
  title: string;
  values: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferences, setPreferences] = useState<PreferenceSection[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      setEmail(user.email ?? "");
      setFullName(user.user_metadata?.full_name ?? "");

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("tone, sector, schedule, format")
        .eq("user_id", user.id)
        .single();

      const { data: catPrefs } = await supabase
        .from("user_category_prefs")
        .select("category_id, categories(name)")
        .eq("user_id", user.id);

      const categoryNames: string[] = (catPrefs ?? [])
        .map((c: Record<string, unknown>) => {
          const cat = c.categories as { name: string } | null;
          return cat?.name ?? "";
        })
        .filter(Boolean);

      const userPrefs = prefs ?? { tone: [], sector: [], schedule: [], format: [] };

      setPreferences([
        { title: "Topics", values: categoryNames },
        { title: "Styles", values: userPrefs.tone ?? [] },
        { title: "Locations", values: userPrefs.sector ?? [] },
        { title: "Times", values: userPrefs.schedule ?? [] },
        { title: "Formats", values: userPrefs.format ?? [] },
      ]);

      setLoadingPrefs(false);
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
            <button
              onClick={() => router.push("/onboarding?edit=true")}
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Edit
            </button>
          </div>

          {loadingPrefs ? (
            <p className="text-sm text-gray-400">Loading preferences...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {preferences.map((section) => (
                <div
                  key={section.title}
                  className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2"
                >
                  <span className="font-semibold text-gray-900">
                    {section.title}
                  </span>
                  {section.values.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {section.values.map((val) => (
                        <span
                          key={val}
                          className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium"
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">None selected</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
