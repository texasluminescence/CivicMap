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
      if (!user) return;

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
          .single(),
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
  }, [supabase]);

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
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("user_category_prefs").delete().eq("user_id", user.id);

      if (draftPreferences.topics.length > 0) {
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
            <button
              type="button"
              onClick={() => {
                if (isEditMode) {
                  savePreferences();
                } else {
                  setDraftPreferences(preferences);
                  setIsEditMode(true);
                  setSaveMessage(null);
                  setError(null);
                }
              }}
              disabled={isSaving}
              className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition ${
                isEditMode
                  ? "bg-[#72C685] text-gray-900 hover:bg-[#5fb472] disabled:opacity-60"
                  : "bg-[#0A38AC] text-white hover:bg-[#082d87]"
              }`}
            >
              {isEditMode ? (isSaving ? "Saving..." : "Save") : "Edit"}
            </button>
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
                  onClick={(eid) => router.push(`/events/${eid}`)}
                  onToggleSave={handleToggleBookmark}
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
                  onClick={(eid) => router.push(`/events/${eid}`)}
                  onToggleSave={handleToggleBookmark}
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
