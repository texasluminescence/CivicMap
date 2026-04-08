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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("user_interactions").upsert(
        {
          user_id: user.id,
          event_id: id,
          interaction_type: "view",
          weight: 0.5,
        },
        { onConflict: "user_id, event_id, interaction_type" }
      );
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (nextState) {
          await supabase
            .from("saved_events")
            .upsert({ user_id: user.id, event_id: id });
        } else {
          await supabase
            .from("saved_events")
            .delete()
            .eq("user_id", user.id)
            .eq("event_id", id);
        }
      }
    } catch (err) {
      console.error(err);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      onToggleRegister?.(id, nextState);

      if (nextState) {
        await supabase
          .from("registered_events")
          .upsert({ user_id: user.id, event_id: id });
      } else {
        await supabase
          .from("registered_events")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", id);
      }
    } catch (err) {
      console.error(err);
      onToggleRegister?.(id, !nextState);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* HEADER */}
      <div className="relative h-28 w-full bg-gradient-to-br from-blue-100 to-green-100">
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={handleToggleSave}
            disabled={saving}
            className="rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white hover:scale-110 transition"
          >
            <BookmarkIcon
              isBookmarked={isBookmarked}
              colorScheme={isNeutral ? "neutral" : "blue"}
              className={`h-4 w-4 ${
                isBookmarked ? "text-blue-600 fill-blue-600" : "text-gray-400"
              }`}
            />
          </button>

          <button
            onClick={handleToggleRegister}
            disabled={saving}
            className="rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white hover:scale-110 transition"
          >
            <StarIcon
              isStarred={isRegistered}
              className={`h-4 w-4 ${
                isRegistered ? "text-amber-400 fill-amber-400" : "text-gray-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-col gap-3 p-4">
        <h2 className="line-clamp-2 text-[15px] font-semibold text-gray-900">
          {title}
        </h2>

        <div className="flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <LocationIcon className="h-4 w-4 text-[#0A38AC]" />
            <span className="truncate">{location}</span>
          </div>

          <div className="flex items-center gap-2">
            <TimeIcon className="h-4 w-4 text-[#72C685]" />
            <span>{eventDate}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
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
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${getTagClasses(
                  tag.type
                )}`}
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