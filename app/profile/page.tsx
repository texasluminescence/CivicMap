"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiniEventCard, { Tag } from "@/components/MiniEventCard";
import { CompassIcon, UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

interface PreferenceState {
  topics: string[];
  styles: string[];
  sectors: string[];
  schedule: string[];
  format: string[];
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

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
};

const getValueByKeys = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in record && record[key] != null) {
      return record[key];
    }
  }
  return null;
};

const getFirstExistingKey = (
  record: Record<string, unknown>,
  keys: string[],
  fallback: string,
): string => {
  for (const key of keys) {
    if (key in record) {
      return key;
    }
  }
  return fallback;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [draftPreferences, setDraftPreferences] = useState<PreferenceState>(EMPTY_PREFERENCES);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [topicColumn, setTopicColumn] = useState("category");
  const [userPreferenceColumns, setUserPreferenceColumns] = useState({
    styles: "styles",
    sectors: "sectors",
    schedule: "schedule",
    format: "format",
  });

  const [savedEvents] = useState<SavedEvent[]>(mockSavedEvents);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setPreferencesError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.push("/auth/login");
        return;
      }

      const authUser = authData.user;
      setUser({
        id: authUser.id,
        email: authUser.email ?? "",
        fullName:
          (authUser.user_metadata?.full_name as string | undefined) ??
          (authUser.user_metadata?.name as string | undefined) ??
          "User",
        avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? undefined,
      });

      const [{ data: userPrefsData }, { data: userCategoryData }] = await Promise.all([
        supabase.from("user_preferences").select("*").eq("user_id", authUser.id).maybeSingle(),
        supabase.from("user_category_prefs").select("*").eq("user_id", authUser.id),
      ]);

      const prefRecord = (userPrefsData ?? {}) as Record<string, unknown>;
      const detectedCategoryColumn =
        (userCategoryData ?? []).length > 0
          ? getFirstExistingKey(
              (userCategoryData?.[0] ?? {}) as Record<string, unknown>,
              ["category", "topic", "preference_category"],
              "category",
            )
          : "category";

      setTopicColumn(detectedCategoryColumn);
      setUserPreferenceColumns({
        styles: getFirstExistingKey(prefRecord, ["styles", "tones", "preferred_tones", "tone_preferences"], "styles"),
        sectors: getFirstExistingKey(prefRecord, ["sectors", "preferred_sectors", "sector_preferences"], "sectors"),
        schedule: getFirstExistingKey(prefRecord, ["schedule", "preferred_schedule", "schedule_preferences"], "schedule"),
        format: getFirstExistingKey(
          prefRecord,
          ["format", "formats", "preferred_format", "preferred_formats", "format_preferences"],
          "format",
        ),
      });

      const loadedPrefs: PreferenceState = {
        topics: (userCategoryData ?? [])
          .map((row) => {
            const categoryValue =
              row.category ??
              row.topic ??
              row.preference_category;
            return categoryValue ? String(categoryValue).trim() : "";
          })
          .filter((value) => value.length > 0),
        styles: toArray(getValueByKeys(prefRecord, ["styles", "tones", "preferred_tones", "tone_preferences"])),
        sectors: toArray(getValueByKeys(prefRecord, ["sectors", "preferred_sectors", "sector_preferences"])),
        schedule: toArray(getValueByKeys(prefRecord, ["schedule", "preferred_schedule", "schedule_preferences"])),
        format: toArray(getValueByKeys(prefRecord, ["format", "formats", "preferred_format", "preferred_formats", "format_preferences"])),
      };

      setPreferences(loadedPrefs);
      setDraftPreferences(loadedPrefs);
      setIsLoadingProfile(false);
    };

    loadProfile();
  }, [router, supabase]);

  const handleLogout = () => {
    supabase.auth.signOut().finally(() => {
      router.push("/auth/login");
    });
  };

  const toggleSelection = (key: keyof PreferenceState, option: string) => {
    setDraftPreferences((prev) => {
      const hasOption = prev[key].includes(option);
      const nextValues = hasOption
        ? prev[key].filter((item) => item !== option)
        : [...prev[key], option];

      return {
        ...prev,
        [key]: nextValues,
      };
    });
  };

  const savePreferences = async () => {
    if (!user) {
      setPreferencesError("Unable to save preferences without an authenticated user.");
      return;
    }

    setIsSaving(true);
    setPreferencesError(null);
    setSaveMessage(null);

    try {
      const topicColumnCandidates = [
        "category",
        "topic",
        "preference_category",
        topicColumn,
      ].filter((value, index, arr) => arr.indexOf(value) === index);

      let resolvedTopicColumn: string | null = null;
      let lastCategoryError: string | null = null;

      for (const columnName of topicColumnCandidates) {
        const probeResult = await supabase
          .from("user_category_prefs")
          .select(columnName)
          .limit(1);

        if (!probeResult.error) {
          resolvedTopicColumn = columnName;
          setTopicColumn(columnName);
          break;
        }

        lastCategoryError = probeResult.error.message;
      }

      if (!resolvedTopicColumn) {
        throw new Error(
          `Unable to update user_category_prefs. ${lastCategoryError ?? "No valid topic column found."}`,
        );
      }

      const clearCategoryPrefsResult = await supabase
        .from("user_category_prefs")
        .delete()
        .eq("user_id", user.id);

      if (clearCategoryPrefsResult.error) {
        throw new Error(
          `Unable to update user_category_prefs. ${clearCategoryPrefsResult.error.message}`,
        );
      }

      if (draftPreferences.topics.length > 0) {
        const categoryRows = draftPreferences.topics.map((topic) => ({
          user_id: user.id,
          [resolvedTopicColumn]: topic,
        }));

        const insertCategoriesResult = await supabase
          .from("user_category_prefs")
          .insert(categoryRows);

        if (insertCategoriesResult.error) {
          throw new Error(
            `Unable to update user_category_prefs. ${insertCategoriesResult.error.message}`,
          );
        }
      }

      const userPreferencePayloads: Array<Record<string, unknown>> = [
        {
          user_id: user.id,
          [userPreferenceColumns.styles]: draftPreferences.styles,
          [userPreferenceColumns.sectors]: draftPreferences.sectors,
          [userPreferenceColumns.schedule]: draftPreferences.schedule,
          [userPreferenceColumns.format]: draftPreferences.format,
        },
        {
          user_id: user.id,
          styles: draftPreferences.styles,
          sectors: draftPreferences.sectors,
          schedule: draftPreferences.schedule,
          format: draftPreferences.format,
        },
        {
          user_id: user.id,
          preferred_tones: draftPreferences.styles,
          preferred_sectors: draftPreferences.sectors,
          preferred_schedule: draftPreferences.schedule,
          preferred_formats: draftPreferences.format,
        },
      ];

      let userPrefsSaved = false;
      let lastUserPrefsError: string | null = null;
      for (const payload of userPreferencePayloads) {
        const upsertResult = await supabase
          .from("user_preferences")
          .upsert(payload, { onConflict: "user_id" });

        if (!upsertResult.error) {
          userPrefsSaved = true;
          break;
        }

        lastUserPrefsError = upsertResult.error.message;
      }

      if (!userPrefsSaved) {
        throw new Error(
          `Unable to update user_preferences. ${lastUserPrefsError ?? "Check table schema/RLS policies."}`,
        );
      }

      setPreferences(draftPreferences);
      setIsEditMode(false);
      setSaveMessage("Preferences updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update preferences.";
      setPreferencesError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#111827]">Loading profile...</p>
      </div>
    );
  }

  const selectedPreferences = isEditMode ? draftPreferences : preferences;

  const renderMultiSelect = (
    key: keyof PreferenceState,
    options: string[],
    questionTitle: string,
    helperText?: string,
  ) => (
    <div className="border border-[#0A38AC]/20 rounded-xl p-4 flex flex-col gap-3 bg-white">
      <div>
        <h3 className="font-semibold text-[#111827]">{questionTitle}</h3>
        {helperText ? <p className="text-sm text-[#111827]/70 mt-1">{helperText}</p> : null}
      </div>
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
                  : "border-[#111827]/20 bg-white text-[#111827]"
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
    <div className="min-h-screen bg-white flex flex-col pb-24">
      <header className="bg-white border-b border-[#0A38AC]/20 px-6 py-6 flex items-center gap-4 sticky top-0 z-10">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#0A38AC]/10 flex items-center justify-center text-[#0A38AC]">
            {user?.fullName ? user.fullName.charAt(0) : "U"}
          </div>
        )}

        <div className="flex flex-col">
          <span className="font-semibold text-lg text-[#111827]">{user?.fullName ?? "User"}</span>
          <span className="text-[#111827]/70 text-sm">{user?.email ?? ""}</span>
        </div>

        <button
          onClick={handleLogout}
          className="ml-auto bg-[#111827] text-white px-4 py-2 rounded-lg hover:bg-black transition"
        >
          Logout
        </button>
      </header>

      <main className="flex flex-col gap-8 px-6 mt-6">
        <section className="bg-white rounded-2xl border border-[#0A38AC]/20 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">Preferences</h2>
              <p className="text-sm text-[#111827]/70">
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
                    setPreferencesError(null);
                  }}
                  className="inline-flex items-center rounded-md border border-[#111827]/25 px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#0A38AC]/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={isSaving}
                  className="inline-flex items-center rounded-md bg-[#72C685] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#5fb472] disabled:opacity-60"
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
                  setPreferencesError(null);
                }}
                className="inline-flex items-center rounded-md bg-[#0A38AC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#082d87]"
              >
                Edit
              </button>
            )}
          </div>

          {preferencesError ? (
            <p className="text-sm text-red-600">{preferencesError}</p>
          ) : null}
          {saveMessage ? (
            <p className="text-sm text-[#2c8f52]">{saveMessage}</p>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderMultiSelect(
              "topics",
              TOPIC_OPTIONS,
              "Topics",
            )}
            {renderMultiSelect(
              "styles",
              STYLE_OPTIONS,
              "Style",
            )}
            {renderMultiSelect(
              "sectors",
              SECTOR_OPTIONS,
              "Sectors",
              "You will always see Virtual events regardless of sector selection.",
            )}
            {renderMultiSelect(
              "schedule",
              SCHEDULE_OPTIONS,
              "Schedule",
            )}
            {renderMultiSelect(
              "format",
              FORMAT_OPTIONS,
              "Format",
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-[#111827]">Saved Events</h2>

          {savedEvents.length === 0 ? (
            <p className="text-[#111827]/70">You haven’t saved any events yet.</p>
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

      <nav className="flex w-full justify-around bg-white border-t border-[#0A38AC]/20 py-4 fixed bottom-0">
        <button
          onClick={() => router.push("/")}
          className="flex flex-col items-center text-[#111827]/70"
        >
          <CompassIcon />
          <span className="text-sm">Explore</span>
        </button>
        <button className="flex flex-col items-center text-[#0A38AC]">
          <UserIcon />
          <span className="text-sm">Profile</span>
        </button>
      </nav>
    </div>
  );
}
