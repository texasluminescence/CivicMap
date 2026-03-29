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

  return (
    <article
      onClick={handleCardClick}
      className="cursor-pointer bg-white rounded-xl shadow-md hover:shadow-lg transition flex flex-col overflow-hidden"
    >
      <div className="flex justify-end gap-1.5 px-3 pt-3">
        <button
          onClick={handleToggleSave}
          disabled={saving}
          aria-label={isBookmarked ? "Remove bookmark" : "Save event"}
          className="bg-gray-100 p-1.5 rounded-full hover:bg-gray-200 transition"
        >
          <BookmarkIcon
            isBookmarked={isBookmarked}
            colorScheme={isNeutral ? "neutral" : "blue"}
            className="w-5 h-5"
          />
        </button>

        <div
          aria-label={isRegistered ? "Registered" : "Not registered"}
          className={`p-1.5 rounded-full ${isRegistered ? "bg-amber-50" : "bg-gray-100"}`}
        >
          <StarIcon isStarred={isRegistered} className="w-5 h-5" />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">{title}</h2>

        <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <LocationIcon className={`w-4 h-4 ${isNeutral ? "text-gray-700" : "text-blue-600"}`} />
          <span className="truncate">{location}</span>
        </div>

        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
          <TimeIcon className="w-4 h-4" />
          <span>{eventDate}</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {tags
            .flatMap((tag) =>
              tag.label.split(",").map((part, i) => ({
                ...tag,
                id: `${tag.id}-${i}`,
                label: part.trim(),
              }))
            )
            .filter((tag) => tag.label)
            .slice(0, 4)
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