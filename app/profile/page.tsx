"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";

interface PreferenceState {
  topics: string[];
  styles: string[];
  sectors: string[];
  schedule: string[];
  format: string[];
}

const TOPIC_OPTIONS = [
  "Housing",
  "Environment",
  "Education",
  "Healthcare",
  "Transportation",
  "Public Safety",
  "Economy",
  "Social Justice",
];

const STYLE_OPTIONS = [
  "Informational",
  "Contentious",
  "Collaborative",
  "Action-Oriented",
  "Procedural",
  "Celebration",
  "Advocacy",
  "Empathetic",
  "Urgent",
  "Neutral",
];

const SECTOR_OPTIONS = ["Central", "North", "South", "East", "West", "Campus"];
const SCHEDULE_OPTIONS = ["Weekdays", "Weekends", "Mornings", "Evenings"];
const FORMAT_OPTIONS = ["In-Person", "Virtual"];

const EMPTY_PREFERENCES: PreferenceState = {
  topics: [],
  styles: [],
  sectors: [],
  schedule: [],
  format: [],
};

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [draftPreferences, setDraftPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      const loaded: PreferenceState = {
        topics: categoryNames,
        styles: userPrefs.tone ?? [],
        sectors: userPrefs.sector ?? [],
        schedule: userPrefs.schedule ?? [],
        format: userPrefs.format ?? [],
      };

      setPreferences(loaded);
      setDraftPreferences(loaded);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const toggleSelection = (key: keyof PreferenceState, option: string) => {
    setDraftPreferences((prev) => ({
      ...prev,
      [key]: prev[key].includes(option)
        ? prev[key].filter((item) => item !== option)
        : [...prev[key], option],
    }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update category preferences
      await supabase.from("user_category_prefs").delete().eq("user_id", user.id);

      if (draftPreferences.topics.length > 0) {
        // Look up category IDs by name
        const { data: categories } = await supabase
          .from("categories")
          .select("id, name")
          .in("name", draftPreferences.topics);

        if (categories && categories.length > 0) {
          const categoryRows = categories.map((cat) => ({
            user_id: user.id,
            category_id: cat.id,
          }));
          const { error: catError } = await supabase
            .from("user_category_prefs")
            .insert(categoryRows);
          if (catError) throw catError;
        }
      }

      // Update other preferences
      await supabase.from("user_preferences").delete().eq("user_id", user.id);
      const { error: prefError } = await supabase.from("user_preferences").upsert({
        user_id: user.id,
        tone: draftPreferences.styles,
        sector: draftPreferences.sectors,
        schedule: draftPreferences.schedule,
        format: draftPreferences.format,
      });
      if (prefError) throw prefError;

      setPreferences(draftPreferences);
      setIsEditMode(false);
      setSaveMessage("Preferences updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPreferences = isEditMode ? draftPreferences : preferences;

  const renderMultiSelect = (
    key: keyof PreferenceState,
    options: string[],
    title: string,
  ) => (
    <div className="border border-[#0A38AC]/20 rounded-xl p-4 flex flex-col gap-3 bg-white">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedPreferences[key].includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={!isEditMode}
              onClick={() => toggleSelection(key, option)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selected
                  ? "border-[#0A38AC] bg-[#0A38AC]/10 text-[#0A38AC]"
                  : "border-gray-200 bg-white text-gray-700"
              } ${!isEditMode ? "cursor-default opacity-90" : "hover:border-[#0A38AC]"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );

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
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftPreferences(preferences);
                    setIsEditMode(false);
                    setError(null);
                  }}
                  className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={isSaving}
                  className="inline-flex items-center rounded-md bg-[#72C685] px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-[#5fb472] disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftPreferences(preferences);
                  setIsEditMode(true);
                  setSaveMessage(null);
                  setError(null);
                }}
                className="inline-flex items-center rounded-md bg-[#0A38AC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#082d87]"
              >
                Edit
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saveMessage && <p className="text-sm text-green-600">{saveMessage}</p>}

          {loading ? (
            <p className="text-sm text-gray-400">Loading preferences...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderMultiSelect("topics", TOPIC_OPTIONS, "Topics")}
              {renderMultiSelect("styles", STYLE_OPTIONS, "Styles")}
              {renderMultiSelect("sectors", SECTOR_OPTIONS, "Locations")}
              {renderMultiSelect("schedule", SCHEDULE_OPTIONS, "Times")}
              {renderMultiSelect("format", FORMAT_OPTIONS, "Formats")}
            </div>
          )}
        </section>

        {/* Saved Events Section */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-gray-900">Saved Events</h2>
          <p className="text-gray-500">You haven&apos;t saved any events yet.</p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
