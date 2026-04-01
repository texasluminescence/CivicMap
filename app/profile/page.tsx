"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import MiniEventCard from "@/components/MiniEventCard";
import { Tag } from "@/lib/types";

// --- Interfaces & Constants ---

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

const TOPIC_OPTIONS = ["Housing", "Environment", "Education", "Healthcare", "Transportation", "Public Safety", "Economy", "Social Justice"];
const STYLE_OPTIONS = ["Informational", "Contentious", "Collaborative", "Action-Oriented", "Procedural", "Celebration", "Advocacy", "Empathetic", "Urgent", "Neutral"];
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

// --- Helper Functions ---

function buildTags(categories: string | null, tone: string | null): Tag[] {
  const tags: Tag[] = [];
  if (categories) {
    categories.split(",").forEach((c, i) => {
      const trimmed = c.trim();
      if (trimmed) tags.push({ id: `cat-${i}-${trimmed}`, label: trimmed, type: "Topic" });
    });
  }
  if (tone) {
    tone.split(",").forEach((t, i) => {
      const trimmed = t.trim();
      if (trimmed) tags.push({ id: `tone-${i}-${trimmed}`, label: trimmed, type: "Tone" });
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
  });
};

// --- Main Component ---

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
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_category_prefs").select("category_id, categories(name)").eq("user_id", user.id),
        supabase.from("saved_events").select("events(*)").eq("user_id", user.id),
        supabase.from("registered_events").select("events(*)").eq("user_id", user.id),
      ]);

      // Map Categories (Topics)
      const categoryNames = (catPrefs ?? [])
        .map((c: any) => c.categories?.name)
        .filter(Boolean);

      const loaded: PreferenceState = {
        topics: categoryNames,
        styles: prefs?.tone ?? [],      // tone col -> styles state
        sectors: prefs?.sector ?? [],   // sector col -> sectors state
        schedule: prefs?.schedule ?? [],
        format: prefs?.format ?? [],
      };

      setPreferences(loaded);
      setDraftPreferences(loaded);

      // Map Events using main branch's robust mapping style
      const mapEvents = (rows: any[] | null): EventData[] =>
        (rows ?? [])
          .map((row) => {
            const e = row.events;
            if (!e) return null;
            return {
              ...e,
              id: String(e.id),
              tags: buildTags(e.categories, e.tone),
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
    // 1. Client-side Validation (New Feature)
    const totalSelections =
      draftPreferences.topics.length +
      draftPreferences.styles.length +
      draftPreferences.sectors.length +
      draftPreferences.schedule.length +
      draftPreferences.format.length;

    if (totalSelections === 0) {
      setError("At least one preference must be selected to save your profile.");
      setSaveMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 2. Call New API Feature
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

      // Success
      setPreferences(draftPreferences);
      setIsEditMode(false);
      setSaveMessage("Preferences updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save preferences.");
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

  const renderMultiSelect = (
    key: keyof PreferenceState,
    options: string[],
    title: string
  ) => (
    <div className="border border-[#0A38AC]/20 rounded-xl p-4 flex flex-col gap-3 bg-white">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = (isEditMode ? draftPreferences : preferences)[key].includes(option);
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
      {/* Header */}
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

      <main className="flex flex-col gap-10 px-6 mt-6">
        {/* Preferences Section */}
        <section className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Preferences</h2>
            <button
              onClick={() => (isEditMode ? savePreferences() : setIsEditMode(true))}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
                isEditMode ? "bg-green-500 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {isEditMode ? (isSaving ? "Saving..." : "Save") : "Edit"}
            </button>
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
            <p className="text-sm text-gray-400 italic">Loading preferences...</p>
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

        {/* Registered Events Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">My Registrations</h2>
          {registeredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {registeredEvents.map((event) => (
                <MiniEventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  location={event.location || "Austin, TX"}
                  eventDate={formatEventDate(event.event_date)}
                  tags={event.tags}
                  isBookmarked={bookmarkedIds.includes(event.id)}
                  onClick={(id) => router.push(`/events/${id}`)}
                  onToggleSave={handleToggleBookmark}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">You haven&apos;t registered for any events yet.</p>
          )}
        </section>

        {/* Saved Events Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">Saved Events</h2>
          {savedEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedEvents.map((event) => (
                <MiniEventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  location={event.location || "Austin, TX"}
                  eventDate={formatEventDate(event.event_date)}
                  tags={event.tags}
                  isBookmarked={bookmarkedIds.includes(event.id)}
                  onClick={(id) => router.push(`/events/${id}`)}
                  onToggleSave={handleToggleBookmark}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">You haven&apos;t saved any events yet.</p>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}