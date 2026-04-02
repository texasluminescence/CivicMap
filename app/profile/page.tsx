"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import MiniEventCard from "@/components/MiniEventCard";
import { Tag } from "@/lib/types";

interface EventData {
  id: string;
  title: string;
  location: string;
  event_date: string | null;
  description: string;
  categories: string | null;
  tone: string | null;
  tags: Tag[];
}

interface PreferenceState {
  topics: string[];
  styles: string[];
  sectors: string[];
  schedule: string[];
  format: string[];
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
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [draftPreferences, setDraftPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<EventData[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<EventData[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  useEffect(() => {
    const initProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      setEmail(user.email ?? "");
      setFullName(user.user_metadata?.full_name ?? "");

      const [
        { data: prefs },
        { data: catPrefs },
        { data: savedData },
        { data: registeredData },
      ] = await Promise.all([
        supabase
          .from("user_preferences")
          .select("tone, sector, schedule, format")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_category_prefs")
          .select("category_id, categories(name)")
          .eq("user_id", user.id),
        supabase
          .from("saved_events")
          .select("event_id, events(id, title, description, location, event_date, categories, tone)")
          .eq("user_id", user.id),
        supabase
          .from("registered_events")
          .select("event_id, events(id, title, description, location, event_date, categories, tone)")
          .eq("user_id", user.id),
      ]);

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

      const mapEvents = (rows: Record<string, unknown>[] | null): EventData[] =>
        (rows ?? [])
          .map((row) => {
            const e = row.events as Record<string, unknown> | null;
            if (!e) return null;
            return {
              id: String(e.id),
              title: String(e.title ?? ""),
              location: String(e.location ?? ""),
              event_date: e.event_date as string | null,
              description: String(e.description ?? ""),
              categories: e.categories as string | null,
              tone: e.tone as string | null,
              tags: buildTags(e.categories as string | null, e.tone as string | null),
            };
          })
          .filter((e): e is EventData => e !== null);

      const saved = mapEvents(savedData);
      const registered = mapEvents(registeredData);

      setSavedEvents(saved);
      setRegisteredEvents(registered);
      setBookmarkedIds(saved.map((e) => e.id));
      setLoading(false);
    };

    initProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
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
    setError(null);
    setSaveMessage(null);

    // Client-side check (first line of defense)
    const totalSelections = [
      ...draftPreferences.topics,
      ...draftPreferences.styles,
      ...draftPreferences.sectors,
      ...draftPreferences.schedule,
      ...draftPreferences.format,
    ].filter(Boolean).length;

    if (totalSelections === 0) {
      setError("At least one preference must be selected to save your profile.");
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated. Please log in again.");

      const payload = {
        userId: user.id,
        selections: {
          style: draftPreferences.styles,
          sectors: draftPreferences.sectors,
          schedule: draftPreferences.schedule,
          format: draftPreferences.format,
          topicNames: draftPreferences.topics,
        },
      };

      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save preferences.");

      setPreferences({ ...draftPreferences });
      setIsEditMode(false);
      setSaveMessage("Preferences updated successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setSaveMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBookmark = (eventId: string, newState: boolean) => {
    setBookmarkedIds((prev) =>
      newState ? [...prev, eventId] : prev.filter((id) => id !== eventId)
    );
    if (newState) {
      const eventToAdd =
        registeredEvents.find((e) => e.id === eventId) ??
        savedEvents.find((e) => e.id === eventId);
      if (eventToAdd) {
        setSavedEvents((prev) =>
          prev.some((e) => e.id === eventId) ? prev : [...prev, eventToAdd]
        );
      }
    } else {
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const handleToggleRegister = (eventId: string, newState: boolean) => {
    if (newState) {
      const eventToAdd =
        savedEvents.find((e) => e.id === eventId) ??
        registeredEvents.find((e) => e.id === eventId);
      if (eventToAdd) {
        setRegisteredEvents((prev) =>
          prev.some((e) => e.id === eventId) ? prev : [...prev, eventToAdd]
        );
      }
    } else {
      setRegisteredEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const selectedPreferences = isEditMode ? draftPreferences : preferences;

  const renderMultiSelect = (
    key: keyof PreferenceState,
    options: string[],
    title: string,
  ) => (
    <div className="border border-[#0A38AC]/20 rounded-xl p-3 sm:p-4 flex flex-col gap-3 bg-white">
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
    <div className="min-h-screen bg-gray-50 flex flex-col pb-28">
      <header className="bg-white shadow-md px-4 sm:px-6 py-4 sm:py-6 flex items-center flex-wrap gap-3 sm:gap-4 sticky top-0 z-10">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
          <UserIcon className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-base sm:text-lg truncate">{fullName || "User"}</span>
          <span className="text-gray-500 text-sm truncate">{email}</span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full sm:w-auto sm:ml-auto bg-[#111827] text-white px-4 py-2 rounded-lg hover:bg-black transition"
        >
          Logout
        </button>
      </header>

      <main className="flex flex-col gap-6 sm:gap-8 px-4 sm:px-6 mt-4 sm:mt-6">
        {/* Preferences Section */}
        <section className="bg-white rounded-2xl shadow-md p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Preferences</h2>
              <p className="text-sm text-gray-500">
                Personalize what shows up in your feed.
              </p>
            </div>
            {isEditMode ? (
              <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setDraftPreferences(preferences);
                    setIsEditMode(false);
                    setError(null);
                  }}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-md bg-[#72C685] px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-[#5fb472] disabled:opacity-60 w-full sm:w-auto"
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
                className="inline-flex items-center justify-center rounded-md bg-[#0A38AC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#082d87] w-full sm:w-auto"
              >
                Edit
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          {saveMessage && !error && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm">
              {saveMessage}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading preferences...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {renderMultiSelect("topics", TOPIC_OPTIONS, "Topics")}
              {renderMultiSelect("styles", STYLE_OPTIONS, "Style")}
              {renderMultiSelect("sectors", SECTOR_OPTIONS, "Sectors")}
              {renderMultiSelect("schedule", SCHEDULE_OPTIONS, "Schedule")}
              {renderMultiSelect("format", FORMAT_OPTIONS, "Format")}
            </div>
          )}
        </section>

        {/* Saved Events Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">Saved Events</h2>
          {savedEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {savedEvents.map((event) => (
                <MiniEventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  location={event.location || "Austin, TX"}
                  eventDate={formatEventDate(event.event_date)}
                  tags={event.tags}
                  isBookmarked={bookmarkedIds.includes(event.id)}
                  isRegistered={registeredEvents.some((e) => e.id === event.id)}
                  onClick={(eid) => router.push(`/events/${eid}`)}
                  onToggleSave={handleToggleBookmark}
                  onToggleRegister={handleToggleRegister}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">You haven&apos;t saved any events yet.</p>
          )}
        </section>

        {/* Registered Events Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">My Registrations</h2>
          {registeredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {registeredEvents.map((event) => (
                <MiniEventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  location={event.location || "Austin, TX"}
                  eventDate={formatEventDate(event.event_date)}
                  tags={event.tags}
                  isBookmarked={bookmarkedIds.includes(event.id)}
                  isRegistered={true}
                  onClick={(eid) => router.push(`/events/${eid}`)}
                  onToggleSave={handleToggleBookmark}
                  onToggleRegister={handleToggleRegister}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">You haven&apos;t registered for any events yet.</p>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
