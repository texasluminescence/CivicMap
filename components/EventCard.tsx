"use client";

import React, { FC, useEffect, useMemo, useState } from "react";
import { BookmarkIcon, LocationIcon, TimeIcon } from "./Icons";
import { Tag } from "@/lib/types";
import { getTagClasses } from "@/lib/tagColors";
import { createClient } from "@/lib/supabase/client";

interface EventCardProps {
  eventId: string;
  title: string;
  location: string;
  eventDate: string;
  description: string;
  tags: Tag[];
  onBookmarkToggle: (newState: boolean) => void | Promise<void>;
  onRegisterToggle: (newState: boolean) => void | Promise<void>;
}

const EventCard: FC<EventCardProps> = ({
  eventId,
  title,
  location,
  eventDate,
  description,
  tags,
  onBookmarkToggle,
  onRegisterToggle
}) => {
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [loadingState, setLoadingState] = useState(true);

  useEffect(() => {
    const loadUserState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoadingState(false);
          return;
        }

        const [savedRes, registeredRes] = await Promise.all([
          supabase
            .from("saved_events")
            .select("event_id")
            .eq("user_id", user.id)
            .eq("event_id", eventId)
            .maybeSingle(),

          supabase
            .from("registered_events")
            .select("event_id")
            .eq("user_id", user.id)
            .eq("event_id", eventId)
            .maybeSingle(),
        ]);

        setBookmarked(!!savedRes.data);
        setRegistered(!!registeredRes.data);
      } catch (err) {
        console.error("Failed loading event state:", err);
      } finally {
        setLoadingState(false);
      }
    };

    loadUserState();
  }, [eventId, supabase]);

  const handleBookmarkClick = async () => {
    if (saving) return;

    const next = !bookmarked;
    setSaving(true);
    setBookmarked(next);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (next) {
        await supabase.from("saved_events").upsert(
          { user_id: user.id, event_id: eventId },
          { onConflict: "user_id,event_id" }
        );
      } else {
        await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", eventId);
      }

      await supabase.from("user_interactions").insert({
        user_id: user.id,
        event_id: eventId,
        interaction_type: next ? "save" : "unsave",
        weight: next ? 1.0 : 0.0,
      });

      onBookmarkToggle?.(next);
    } catch (err) {
      console.error(err);
      setBookmarked(!next);
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterToggle = async () => {
    if (saving) return;

    const next = !registered;
    setSaving(true);
    setRegistered(next);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (next) {
        await supabase.from("registered_events").upsert(
          { user_id: user.id, event_id: eventId },
          { onConflict: "user_id,event_id" }
        );
      } else {
        await supabase
          .from("registered_events")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", eventId);
      }

      await supabase.from("user_interactions").insert({
        user_id: user.id,
        event_id: eventId,
        interaction_type: next ? "register" : "unregister",
        weight: next ? 1.5 : 0.0,
      });

      onRegisterToggle?.(next);
    } catch (err) {
      console.error(err);
      setRegistered(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <button
            onClick={handleBookmarkClick}
            disabled={saving}
            aria-label="Toggle bookmark"
            className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition disabled:opacity-50 shrink-0 ml-3"
          >
            <BookmarkIcon isBookmarked={bookmarked} className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-700 leading-relaxed">{description}</p>

        <div className="flex items-center gap-2 text-gray-700">
          <LocationIcon className="w-5 h-5 text-blue-600" />
          <span>{location}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <TimeIcon className="w-5 h-5" />
          <span>{eventDate}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags
            .flatMap((tag) =>
              tag.label.split(",").map((part, i) => ({
                ...tag,
                id: `${tag.id}-${i}`,
                label: part.trim(),
              }))
            )
            .filter((tag) => tag.label)
            .map((tag) => (
              <span
                key={tag.id}
                className={`text-xs px-3 py-1 rounded-full font-medium ${getTagClasses(
                  tag.type
                )}`}
              >
                {tag.label}
              </span>
            ))}
        </div>

        <button
          onClick={handleRegisterToggle}
          disabled={saving}
          className={`mt-2 w-full py-3 rounded-lg font-medium transition ${
            registered
              ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {registered ? "Registered ✕" : "Register for Event"}
        </button>
      </div>
    </article>
  );
};

export default EventCard;