"use client";

import React, { FC } from "react";
import { BookmarkIcon, LocationIcon, TimeIcon } from "./Icons";
import { Tag } from "@/lib/types";
import { getTagClasses } from "@/lib/tagColors";

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
  imageUrl,
  colorScheme = "blue",
  isBookmarked,
  onClick,
  onToggleSave,
}) => {
  const isNeutral = colorScheme === "neutral";

  return (
    <article
      onClick={() => onClick(id)}
      className="cursor-pointer bg-white rounded-xl shadow-md hover:shadow-lg transition flex flex-col overflow-hidden"
    >
      {/* Bookmark row */}
      <div className="flex justify-end px-3 pt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(id, !isBookmarked);
          }}
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          className="bg-gray-100 p-1.5 rounded-full hover:bg-gray-200 transition"
        >
          <BookmarkIcon
            isBookmarked={isBookmarked}
            colorScheme={isNeutral ? "neutral" : "blue"}
            className="w-5 h-5"
          />
        </button>
      </div>

      {/* Content */}
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

        {/* Color-coded tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getTagClasses(
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
