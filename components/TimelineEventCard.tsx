"use client";

import React from "react";
import { LocationIcon, TimeIcon, BookmarkIcon } from "./Icons";
import { Tag } from "@/lib/types";
import { getTagClasses } from "@/lib/tagColors";

interface TimelineEventCardProps {
  index: number;
  id: string;
  title: string;
  location: string;
  eventDate: string;
  tags: Tag[];
  isBookmarked: boolean;
  onClick: (id: string) => void;
  onToggleSave?: (id: string, newState: boolean) => void;
}

export default function TimelineEventCard({
  index,
  id,
  title,
  location,
  eventDate,
  tags,
  isBookmarked,
  onClick,
  onToggleSave,
}: TimelineEventCardProps) {
  const isLeft = index % 2 === 0;
  const [topDate, bottomTime] = eventDate.includes(", ")
    ? (() => {
        const parts = eventDate.split(", ");
        if (parts.length >= 3) {
          return [`${parts[0]}, ${parts[1]}`, parts[2]];
        }
        return [eventDate, ""];
      })()
    :  [eventDate, ""];

  return (
    <div className="relative w-full mb-10">
      {/* mobile version */}
      <div className="md:hidden relative pl-12">
        <div
          className="absolute left-3 top-16 bottom-0 w-[2px] z-0"
          style={{ backgroundColor: "#A6D0E8" }}
        />
        <div
          className="absolute left-0 top-16 h-6 w-6 rounded-full border-4 border-white shadow-md z-0"
          style={{ backgroundColor: "#0A38AC" }}
        />

        <article
          onClick={() => onClick(id)}
          className="cursor-pointer rounded-2xl shadow-md hover:shadow-lg transition p-5 border bg-white"
          style={{ borderColor: "#E5E7EB" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p
                className="text-lg font-bold uppercase tracking-wide mb-3"
                style={{ color: "#0A38AC" }}
              >
                {topDate}
              </p>

              <h2
                className="text-2xl font-semibold leading-tight"
                style={{ color: "#111827" }}
              >
                {title}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <LocationIcon className="w-4 h-4 text-gray-600" />
                <span style={{ color: "#4B5563" }} className="truncate">
                  {location}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm">
                <TimeIcon className="w-4 h-4 text-gray-600" />
                <span style={{ color: "#4B5563" }}>{bottomTime || "Time TBD"}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(id, !isBookmarked);
              }}
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              className="p-2 rounded-full transition shrink-0"
              style={{ backgroundColor: "#F3F4F6" }}
            >
              <BookmarkIcon
                isBookmarked={isBookmarked}
                className="w-5 h-5 text-gray-700"
                colorScheme="neutral"
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag.id}
                className={`text-xs px-3 py-1 rounded-full font-medium ${getTagClasses(tag.type)}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </article>
      </div>

      {/* desktop alternating timeline */}
      <div className="hidden md:block relative min-h-[220px]">
        {/* center line */}
        <div
          className="absolute left-1/2 top-16 bottom-0 w-[3px] -translate-x-1/2 z-0"
          style={{ backgroundColor: "#A6D0E8" }}
        />

        {/* center dot */}
        <div
          className="absolute left-1/2 top-16 h-6 w-6 rounded-full border-4 border-white shadow-md z-0 -translate-x-1/2"
          style={{ backgroundColor: "#0A38AC" }}
        />

        {/* left card */}
        {isLeft && (
          <div className="w-[calc(50%-2rem)] pr-8">
            <article
              onClick={() => onClick(id)}
              className="cursor-pointer rounded-2xl shadow-md hover:shadow-lg transition p-5 border bg-white"
              style={{ borderColor: "#E5E7EB" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className="text-lg font-bold uppercase tracking-wide mb-3"
                    style={{ color: "#0A38AC" }}
                  >
                    {topDate}
                  </p>

                  <h2
                    className="text-3xl font-semibold leading-tight"
                    style={{ color: "#111827" }}
                  >
                    {title}
                  </h2>

                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <LocationIcon className="w-4 h-4 text-gray-600" />
                    <span style={{ color: "#4B5563" }}>{location}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <TimeIcon className="w-4 h-4 text-gray-600" />
                    <span style={{ color: "#4B5563" }}>{bottomTime || "Time TBD"}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave?.(id, !isBookmarked);
                  }}
                  aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                  className="p-2 rounded-full transition shrink-0"
                  style={{ backgroundColor: "#F3F4F6" }}
                >
                  <BookmarkIcon
                    isBookmarked={isBookmarked}
                    className="w-5 h-5 text-gray-700"
                    colorScheme="neutral"
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag.id}
                    className={`text-xs px-3 py-1 rounded-full font-medium ${getTagClasses(tag.type)}`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </article>
          </div>
        )}

        {/* right card */}
        {!isLeft && (
          <div className="ml-auto w-[calc(50%-2rem)] pl-8">
            <article
              onClick={() => onClick(id)}
              className="cursor-pointer rounded-2xl shadow-md hover:shadow-lg transition p-5 border bg-white"
              style={{ borderColor: "#E5E7EB" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className="text-lg font-bold uppercase tracking-wide mb-3"
                    style={{ color: "#0A38AC" }}
                  >
                    {topDate}
                  </p>

                  <h2
                    className="text-3xl font-semibold leading-tight"
                    style={{ color: "#111827" }}
                  >
                    {title}
                  </h2>

                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <LocationIcon className="w-4 h-4 text-gray-600" />
                    <span style={{ color: "#4B5563" }}>{location}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <TimeIcon className="w-4 h-4 text-gray-600" />
                    <span style={{ color: "#4B5563" }}>{bottomTime || "Time TBD"}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave?.(id, !isBookmarked);
                  }}
                  aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                  className="p-2 rounded-full transition shrink-0"
                  style={{ backgroundColor: "#F3F4F6" }}
                >
                  <BookmarkIcon
                    isBookmarked={isBookmarked}
                    className="w-5 h-5 text-gray-700"
                    colorScheme="neutral"
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag.id}
                    className={`text-xs px-3 py-1 rounded-full font-medium ${getTagClasses(tag.type)}`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}