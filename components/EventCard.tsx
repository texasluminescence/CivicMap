"use client";

import React, { FC, useState } from "react";
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
  isBookmarked: boolean;
  onBookmarkToggle: (newState: boolean) => void | Promise<void>;
}

const EventCard: FC<EventCardProps> = ({
  eventId,
  title,
  location,
  eventDate,
  description,
  tags,
  isBookmarked,
  onBookmarkToggle,
}) => {
  const [saving, setSaving] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleBookmarkClick = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onBookmarkToggle(!isBookmarked);
      const supabase = createClient();                          
      const { data: { user } } = await supabase.auth.getUser(); 
      if (!user) return;                                        
      await supabase.from("user_interactions").insert({
        user_id: user.id,
        event_id: eventId,
        interaction_type: "save",
        weight: 1.00,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async () => {
    setRegistered(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_interactions").insert({
      user_id: user.id,
      event_id: eventId,
      interaction_type: "register",
      weight: 1.50,
    });
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
            <BookmarkIcon isBookmarked={isBookmarked} className="w-5 h-5" />
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

        <button
          onClick={handleRegister}
          disabled={registered}
          className={`mt-2 w-full py-3 rounded-lg font-medium transition ${
            registered
              ? "bg-green-100 text-green-700 cursor-default"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {registered ? "Registered" : "Register for Event"}
        </button>
      </div>
    </article>
  );
};

export default EventCard;
