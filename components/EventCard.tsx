"use client";

import React, { FC } from "react";
import { BookmarkIcon, LocationIcon, TimeIcon } from "./Icons";
import Image from "next/image";
import { Tag } from "./MiniEventCard";

interface EventCardProps {
  title: string;
  location: string;
  eventDate: string; 
  description: string;
  tags: Tag[];
  imageUrl?: string;
  // Controlled state from parent
  isBookmarked: boolean; 
  // New props for interaction logic
  userId: string | null;
  eventId: string;
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
  userId, // Retained for logging/potential future use
  eventId,
  onBookmarkToggle,
}) => {
  
  const handleBookmarkClick = () => {
    onBookmarkToggle(!isBookmarked);
  };

  return (
    <article className="flex flex-col lg:flex-row w-full max-w-5xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Left Image */}
      <div className="relative w-full lg:w-1/2 h-64 lg:h-auto bg-gray-100">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
        <button
          onClick={handleBookmarkClick}
          // Button is now always enabled for immediate clicking
          className={`absolute top-3 right-3 p-2 rounded-full transition bg-white/80 hover:bg-white`}
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          <BookmarkIcon isBookmarked={isBookmarked} className="w-6 h-6" />
        </button>
      </div>

      {/* Right Details */}
      <div className="flex flex-col p-6 gap-4 flex-1">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>

        {/* Description is correctly placed below the title (order-2) */}
        <p className="text-gray-700 leading-relaxed order-2">{description}</p>
        
        {/* Location (Order 3) */}
        <div className="flex items-center gap-2 text-gray-700 font-medium order-3">
          <LocationIcon className="w-5 h-5 text-blue-700" />
          {location}
        </div>

        {/* Time (Order 4) */}
        <div className="flex items-center gap-2 text-gray-600 order-4">
          <TimeIcon className="w-5 h-5 text-gray-500" />
          {eventDate}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-2 order-5">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-lg"
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