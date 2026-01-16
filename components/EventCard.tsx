"use client";

import React, { FC, useState } from "react";
import Image from "next/image";
import { BookmarkIcon, LocationIcon, TimeIcon } from "./Icons";
import { Tag } from "@/lib/types";
import { getTagClasses } from "@/lib/tagColors";

interface EventCardProps {
  eventId: string;
  title: string;
  location: string;
  eventDate: string;
  description: string;
  tags: Tag[];
  imageUrl?: string;
  isBookmarked: boolean;
  onBookmarkToggle: (newState: boolean) => Promise<void>;
}

const EventCard: FC<EventCardProps> = ({
  title,
  location,
  eventDate,
  description,
  tags,
  imageUrl,
  isBookmarked,
  onBookmarkToggle,
}) => {
  const [saving, setSaving] = useState(false);

  const handleBookmarkClick = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onBookmarkToggle(!isBookmarked);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="w-full max-w-5xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col lg:flex-row">
      {/* Image */}
      <div className="relative w-full lg:w-1/2 h-64 bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}

        <button
          onClick={handleBookmarkClick}
          disabled={saving}
          aria-label="Toggle bookmark"
          className="absolute top-3 right-3 bg-white/80 p-2 rounded-full hover:bg-white transition disabled:opacity-50"
        >
          <BookmarkIcon isBookmarked={isBookmarked} className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-4 flex-1">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>

        <p className="text-gray-700 leading-relaxed">{description}</p>

        <div className="flex items-center gap-2 text-gray-700">
          <LocationIcon className="w-5 h-5 text-blue-600" />
          <span>{location}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <TimeIcon className="w-5 h-5" />
          <span>{eventDate}</span>
        </div>

        {/* Color-coded tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
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
      </div>
    </article>
  );
};

export default EventCard;
