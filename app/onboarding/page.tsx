"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "true";
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dbCategories, setDbCategories] = useState<{ id: number; name: string }[]>([]);
  const [dbTones, setDbTones] = useState<string[]>([]);

  const [selections, setSelections] = useState({
    categoryIds: [] as number[],
    style: [] as string[],
    sectors: [] as string[],
    schedule: [] as string[],
    format: [] as string[],
  });

  // Fetch categories and tones from DB
  useEffect(() => {
    const fetchSchemaValues = async () => {
      const { data: catData } = await supabase.from("categories").select("id, name");
      if (catData) setDbCategories(catData);

      const { data: eventData } = await supabase.from("events").select("tone");
      if (eventData) {
        const tones = Array.from(
          new Set(
            eventData.flatMap((e) =>
              e.tone ? e.tone.split(",").map((t: string) => t.trim()) : []
            )
          )
        ) as string[];
        setDbTones(tones.length > 0 ? tones : ["Formal", "Casual", "Collaborative"]);
      }
    };
    fetchSchemaValues();
  }, [supabase]);

  // If editing, pre-populate selections from existing prefs
  useEffect(() => {
    if (!isEditing) return;

    const loadExisting = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("tone, sector, schedule, format")
        .eq("user_id", uid)
        .single();

      if (prefs) {
        setSelections((prev) => ({
          ...prev,
          style: prefs.tone ?? [],
          sectors: prefs.sector ?? [],
          schedule: prefs.schedule ?? [],
          format: prefs.format ?? [],
        }));
      }

      const { data: catPrefs } = await supabase
        .from("user_category_prefs")
        .select("category_id")
        .eq("user_id", uid);

      if (catPrefs) {
        setSelections((prev) => ({
          ...prev,
          categoryIds: catPrefs.map((c) => c.category_id),
        }));
      }
    };
    loadExisting();
  }, [isEditing, supabase]);

  const toggleId = (id: number) => {
    setSelections((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((x) => x !== id)
        : [...prev.categoryIds, id],
    }));
  };

  const toggleString = (key: keyof typeof selections, val: string) => {
    setSelections((prev) => ({
      ...prev,
      [key]: (prev[key] as string[]).includes(val)
        ? (prev[key] as string[]).filter((x) => x !== val)
        : [...(prev[key] as string[]), val],
    }));
  };

  const handleFinish = async () => {
    // Client-side check (first line of defense)
    const total =
      selections.categoryIds.length +
      selections.style.length +
      selections.sectors.length +
      selections.schedule.length +
      selections.format.length;
    if (total === 0) {
      setError("Please select at least one preference.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No session found");

      // Server-side validation via API (second line of defense)
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, selections }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save preferences");

      router.push(isEditing ? "/profile" : "/events");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const OptionButton = ({
    label,
    isSelected,
    onClick,
  }: {
    label: string;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`group flex items-center justify-between p-4 border-2 rounded-2xl transition-all duration-200 ${
        isSelected
          ? "border-green-500 bg-green-50"
          : "border-gray-100 hover:border-green-100 bg-white"
      }`}
    >
      <span
        className={`text-sm font-semibold ${
          isSelected ? "text-green-700" : "text-gray-600"
        }`}
      >
        {label}
      </span>
      {isSelected && (
        <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
          &#10003;
        </span>
      )}
    </button>
  );

  const stepTitles = [
    "What interests you?",
    "Meeting Style",
    "Where are you?",
    "Your Schedule",
    "Event Format",
  ];

  const stepDescriptions = [
    "Select civic topics you care about.",
    "Pick the vibe you want for events.",
    "Choose your preferred neighborhoods.",
    "When works best for you?",
    "How do you want to participate?",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white p-10 rounded-3xl shadow-xl">
        <div className="flex justify-between items-center mb-10">
          <img src="/1.png" alt="CivicMap" className="h-20" />
          <div className="text-sm font-bold text-green-500 uppercase tracking-widest">
            Step {step} of 5
          </div>
        </div>

        {error && (
          <p className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6">
            {error}
          </p>
        )}

        <div className="min-h-[300px]">
          <h2 className="text-3xl font-black text-gray-900 mb-2">
            {stepTitles[step - 1]}
          </h2>
          <p className="text-gray-500 mb-8">{stepDescriptions[step - 1]}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {step === 1 &&
              dbCategories.map((cat) => (
                <OptionButton
                  key={cat.id}
                  label={cat.name}
                  isSelected={selections.categoryIds.includes(cat.id)}
                  onClick={() => toggleId(cat.id)}
                />
              ))}

            {step === 2 &&
              dbTones.map((t) => (
                <OptionButton
                  key={t}
                  label={t}
                  isSelected={selections.style.includes(t)}
                  onClick={() => toggleString("style", t)}
                />
              ))}

            {step === 3 &&
              ["Central", "North", "South", "East", "West", "Campus"].map(
                (s) => (
                  <OptionButton
                    key={s}
                    label={s}
                    isSelected={selections.sectors.includes(s)}
                    onClick={() => toggleString("sectors", s)}
                  />
                )
              )}

            {step === 4 &&
              ["Weekdays", "Weekends", "Mornings", "Evenings"].map((t) => (
                <OptionButton
                  key={t}
                  label={t}
                  isSelected={selections.schedule.includes(t)}
                  onClick={() => toggleString("schedule", t)}
                />
              ))}

            {step === 5 &&
              ["In-Person", "Virtual"].map((t) => (
                <OptionButton
                  key={t}
                  label={t}
                  isSelected={selections.format.includes(t)}
                  onClick={() => toggleString("format", t)}
                />
              ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-8 py-4 font-bold text-gray-400"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              setError(null);
              if (step < 5) { setStep(step + 1); } else { handleFinish(); }
            }}
            disabled={loading}
            className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold hover:bg-green-600 shadow-lg disabled:opacity-50"
          >
            {loading ? "Saving..." : step < 5 ? "Continue" : "Start Exploring"}
          </button>
        </div>
      </div>
    </div>
  );
}
