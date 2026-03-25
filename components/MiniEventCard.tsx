"use client";

import React, { FC, useState } from "react";
import { BookmarkIcon, LocationIcon, TimeIcon } from "./Icons";
import { Tag } from "@/lib/types";
import { getTagClasses } from "@/lib/tagColors";
import { createClient } from "@/lib/supabase/client";

interface MiniEventCardProps {
  id: string;
  title: string;
  location: string;
  eventDate: string;
  tags: Tag[];
  imageUrl?: string;
  colorScheme?: "blue" | "neutral";
  isBookmarked: boolean;
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
  onClick,
  onToggleSave,
}) => {
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const isNeutral = colorScheme === "neutral";

  const handleCardClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Use upsert to match the unique_user_event_interaction constraint
      supabase.from("user_interactions").upsert({
        user_id: user.id,
        event_id: id,
        interaction_type: "view",
        weight: 0.50,
      }, { onConflict: 'user_id, event_id, interaction_type' }).then(({ error }) => {
        if (error) console.error("View log failed:", JSON.stringify(error, null, 2));
      });
    }
    
    onClick(id);
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nextState = !isBookmarked;
      
      onToggleSave?.(id, nextState);

      // 1. Update STATE (saved_events)
      if (nextState) {
        await supabase.from("saved_events").upsert(
          { user_id: user.id, event_id: id }, 
          { onConflict: 'user_id, event_id' }
        );
      } else {
        await supabase.from("saved_events").delete().match({ user_id: user.id, event_id: id });
      }

      // 2. Log INTERACTION (user_interactions) using upsert to prevent unique constraint errors
      await supabase.from("user_interactions").upsert({
        user_id: user.id,
        event_id: id,
        interaction_type: nextState ? "save" : "unsave",
        weight: 1.00,
      }, { onConflict: 'user_id, event_id, interaction_type' });

    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      onToggleSave?.(id, isBookmarked);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className="cursor-pointer bg-white rounded-xl shadow-md hover:shadow-lg transition flex flex-col overflow-hidden"
    >
      <div className="flex justify-end px-3 pt-3">
        <button
          onClick={handleToggleSave}
          disabled={saving}
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          className="bg-gray-100 p-1.5 rounded-full hover:bg-gray-200 transition disabled:opacity-50"
        >
          <BookmarkIcon
            isBookmarked={isBookmarked}
            colorScheme={isNeutral ? "neutral" : "blue"}
            className="w-5 h-5"
          />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {title}
        </h2>

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
              tag.label.split(",").map((subLabel) => ({
                ...tag,
                label: subLabel.trim(),
              }))
            )
            .slice(0, 4) // Increased slice slightly to account for split tags
            .map((tag, index) => (
              <span
                key={`${tag.id}-${index}`}
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