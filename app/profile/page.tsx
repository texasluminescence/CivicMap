"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import { Tag } from "@/lib/types";
import MiniEventCard from "@/components/MiniEventCard";

interface PreferenceState {
  topics: string[];
  styles: string[];
  sectors: string[];
  schedule: string[];
  format: string[];
}

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


function buildTags(categories: string | null, tone: string | null): Tag[] {
  const tags: Tag[] = [];
  if (categories) tags.push({ id: `cat-${categories}`, label: categories, type: "Topic" });
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
  return isNaN(date.getTime()) ? "TBD" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // States for Saved and Registered Events
  const [savedEvents, setSavedEvents] = useState<EventData[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<EventData[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  const [preferences, setPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [draftPreferences, setDraftPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      setEmail(user.email ?? "");
      setFullName(user.user_metadata?.full_name ?? "");

      // 1. Fetch Preferences (Existing logic)
      const { data: prefs } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle();
      const { data: catPrefs } = await supabase.from("user_category_prefs").select("category_id, categories(name)").eq("user_id", user.id);
      
      const categoryNames = (catPrefs ?? []).map((c: any) => c.categories?.name).filter(Boolean);
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

      // 2. Fetch Saved Events
      const { data: savedData } = await supabase
        .from("saved_events")
        .select("events(*)")
        .eq("user_id", user.id);
      
      if (savedData) {
        const formattedSaved = savedData.map((item: any) => ({
          ...item.events,
          tags: buildTags(item.events.categories, item.events.tone)
        }));
        setSavedEvents(formattedSaved);
        setBookmarkedIds(formattedSaved.map((e: any) => e.id));
      }

      // 3. Fetch Registered Events
      const { data: regData } = await supabase
        .from("registered_events")
        .select("events(*)")
        .eq("user_id", user.id);
      
      if (regData) {
        setRegisteredEvents(regData.map((item: any) => ({
          ...item.events,
          tags: buildTags(item.events.categories, item.events.tone)
        })));
      }

      setLoading(false);
    };

    initProfile();
  }, [router, supabase]);

  const handleToggleBookmark = (eventId: string, newState: boolean) => {
    // 1. Update the ID list for the bookmark icons
    setBookmarkedIds((prev) =>
      newState ? [...prev, eventId] : prev.filter((id) => id !== eventId)
    );

    if (newState) {
      // 2. If BOOKMARKING: Add the event to the Saved Events list immediately
      // Check if it's already in savedEvents to avoid duplicates
      setSavedEvents((prev) => {
        if (prev.find((e) => e.id === eventId)) return prev;

        // Find the event data from the registered list to copy it over
        const eventToAdd = registeredEvents.find((e) => e.id === eventId);
        return eventToAdd ? [...prev, eventToAdd] : prev;
      });
    } else {
      // 3. If UN-BOOKMARKING: Remove it from the Saved Events list
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  // ... Keep handleLogout, toggleSelection, savePreferences, and renderMultiSelect ...
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const toggleSelection = (key: keyof PreferenceState, option: string) => {
    setDraftPreferences((prev) => ({
      ...prev,
      [key]: prev[key].includes(option) ? prev[key].filter((item) => item !== option) : [...prev[key], option],
    }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("user_category_prefs").delete().eq("user_id", user.id);
      if (draftPreferences.topics.length > 0) {
        const { data: categories } = await supabase.from("categories").select("id, name").in("name", draftPreferences.topics);
        if (categories) {
          await supabase.from("user_category_prefs").insert(categories.map(cat => ({ user_id: user.id, category_id: cat.id })));
        }
      }
      await supabase.from("user_preferences").upsert({
        user_id: user.id,
        tone: draftPreferences.styles,
        sector: draftPreferences.sectors,
        schedule: draftPreferences.schedule,
        format: draftPreferences.format,
      });
      setPreferences(draftPreferences);
      setIsEditMode(false);
      setSaveMessage("Preferences updated.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderMultiSelect = (key: keyof PreferenceState, options: string[], title: string) => (
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
              className={`rounded-full border px-3 py-1.5 text-sm transition ${selected ? "border-[#0A38AC] bg-[#0A38AC]/10 text-[#0A38AC]" : "border-gray-200 bg-white text-gray-700"} ${!isEditMode ? "opacity-90" : "hover:border-[#0A38AC]"}`}
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
        <button onClick={handleLogout} className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Logout</button>
      </header>

      <main className="flex flex-col gap-10 px-6 mt-6">
        {/* Preferences Section */}
        <section className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Preferences</h2>
            <button onClick={() => isEditMode ? savePreferences() : setIsEditMode(true)} className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isEditMode ? "bg-green-500" : "bg-blue-600"}`}>
              {isEditMode ? (isSaving ? "Saving..." : "Save") : "Edit"}
            </button>
          </div>
          {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
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
                  location={event.location}
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

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">Saved Events</h2>
          {savedEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedEvents.map((event) => (
                <MiniEventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  location={event.location}
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