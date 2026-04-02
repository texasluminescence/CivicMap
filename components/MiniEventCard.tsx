"use client";

import React, { FC, useMemo, useState } from "react";
import { BookmarkIcon, LocationIcon, TimeIcon, StarIcon } from "./Icons";
import { Tag } from "@/lib/types";
import { getTagClasses } from "@/lib/tagColors";
import { createClient } from "@/lib/supabase/client";

interface MiniEventCardProps {
  id: string;
  title: string;
  location: string;
  eventDate: string;
  tags: Tag[];
  colorScheme?: "blue" | "neutral";
  isBookmarked: boolean;
  isRegistered?: boolean;
  onClick: (id: string) => void;
  onToggleSave?: (id: string, newState: boolean) => void;
  onToggleRegister?: (id: string, newState: boolean) => void;
}

const MiniEventCard: FC<MiniEventCardProps> = ({
  id,
  title,
  location,
  eventDate,
  tags,
  colorScheme = "blue",
  isBookmarked,
  isRegistered = false,
  onClick,
  onToggleSave,
  onToggleRegister,
}) => {
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const isNeutral = colorScheme === "neutral";

  const handleCardClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_interactions").upsert(
        {
          user_id: user.id,
          event_id: id,
          interaction_type: "view",
          weight: 0.5,
        },
        { onConflict: "user_id, event_id, interaction_type" }
      ).then(() => {});
    }
    onClick(id);
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    const nextState = !isBookmarked;
    onToggleSave?.(id, nextState);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (nextState) {
          await supabase.from("saved_events").upsert(
            { user_id: user.id, event_id: id },
            { onConflict: "user_id, event_id" }
          );
        } else {
          await supabase
            .from("saved_events")
            .delete()
            .eq("user_id", user.id)
            .eq("event_id", id);
        }

        await supabase.from("user_interactions").insert({
          user_id: user.id,
          event_id: id,
          interaction_type: nextState ? "save" : "unsave",
          weight: nextState ? 1.0 : 0.0,
        });
      }
    } catch (err) {
      console.error("Bookmark sync failed:", err);
      onToggleSave?.(id, !nextState);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRegister = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    const nextState = !isRegistered;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      onToggleRegister?.(id, nextState);
      if (nextState) {
        await supabase.from("registered_events").upsert(
          { user_id: user.id, event_id: id },
          { onConflict: "user_id, event_id" }
        );
      } else {
        await supabase
          .from("registered_events")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", id);
      }

      await supabase.from("user_interactions").insert({
        user_id: user.id,
        event_id: id,
        interaction_type: nextState ? "register" : "unregister",
        weight: nextState ? 1.5 : 0.0,
      });
    } catch (err) {
      console.error("Registration sync failed:", err);
      onToggleRegister?.(id, !nextState);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className="cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex flex-col overflow-hidden border border-gray-100"
    >
      <div className="p-4 flex flex-col gap-2 flex-grow">
        <div className="flex justify-end gap-1.5 mb-1">
          <button
            onClick={handleToggleSave}
            disabled={saving}
            aria-label={isBookmarked ? "Remove bookmark" : "Save event"}
            className="bg-[#0A38AC]/10 p-1.5 rounded-full hover:bg-[#0A38AC]/20 transition"
          >
            <BookmarkIcon
              isBookmarked={isBookmarked}
              colorScheme={isNeutral ? "neutral" : "blue"}
              className="w-4 h-4"
            />
          </button>
          <button
            onClick={handleToggleRegister}
            disabled={saving}
            aria-label={isRegistered ? "Unregister from event" : "Register for event"}
            className={`p-1.5 rounded-full transition ${isRegistered ? "bg-amber-100 hover:bg-amber-200" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            <StarIcon isStarred={isRegistered} className="w-4 h-4" />
          </button>
        </div>

        <h2 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {title}
        </h2>

        <div className="flex items-center justify-between text-xs text-gray-400 gap-2 mt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <LocationIcon className={`w-3.5 h-3.5 shrink-0 ${isNeutral ? "text-gray-500" : "text-[#0A38AC]"}`} />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <TimeIcon className="w-3.5 h-3.5 text-[#72C685]" />
            <span>{eventDate}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-1">
          {tags
            .flatMap((tag) =>
              tag.label.split(",").map((part, i) => ({
                ...tag,
                id: `${tag.id}-${i}`,
                label: part.trim(),
              }))
            )
            .filter((tag) => tag.label)
            .slice(0, 3)
            .map((tag) => (
              <span
                key={tag.id}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getTagClasses(tag.type)}`}
              >
                {tag.label}
              </span>
            ))}
        </div>
      </div>
    </article>
  );
};

export default MiniEventCard;
