"use client";

import React, { FC, useState, useEffect } from "react";
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
  initialRegistered?: boolean;
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
  initialRegistered = false,
  onBookmarkToggle,
}) => {
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(initialRegistered);
  const supabase = createClient();

  useEffect(() => {
    setRegistered(initialRegistered);
  }, [initialRegistered]);

  const handleBookmarkClick = async () => {
    if (saving) return;
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nextState = !isBookmarked;
      await onBookmarkToggle(nextState);

      if (nextState) {
        // UPSERT to prevent duplicates in saved_events
        await supabase.from("saved_events").upsert({ user_id: user.id, event_id: eventId }, { onConflict: 'user_id, event_id' });
        
        // INSERT to allow duplicate interaction logs
        await supabase.from("user_interactions").insert({
          user_id: user.id,
          event_id: eventId,
          interaction_type: "save",
          weight: 1.00,
        });
      } else {
        await supabase.from("saved_events").delete().match({ user_id: user.id, event_id: eventId });
        
        await supabase.from("user_interactions").insert({
          user_id: user.id,
          event_id: eventId,
          interaction_type: "unsave",
          weight: 0.00,
        });
      }
    } catch (error) {
      console.error("Bookmark sync failed:", error);
      onBookmarkToggle(isBookmarked);
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterToggle = async () => {
    if (registering) return;
    setRegistering(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (registered) {
        await supabase.from("registered_events").delete().match({ user_id: user.id, event_id: eventId });
        
        await supabase.from("user_interactions").insert({
          user_id: user.id,
          event_id: eventId,
          interaction_type: "unregister",
          weight: 0.00,
        });
        setRegistered(false);
      } else {
        // UPSERT to prevent duplicates in registered_events
        await supabase.from("registered_events").upsert({ user_id: user.id, event_id: eventId }, { onConflict: 'user_id, event_id' });
        
        await supabase.from("user_interactions").insert({
          user_id: user.id,
          event_id: eventId,
          interaction_type: "register",
          weight: 1.50,
        });
        setRegistered(true);
      }
    } catch (error) {
      console.error("Registration toggle failed:", error);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <article className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col p-6 gap-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <button
          onClick={handleBookmarkClick}
          disabled={saving}
          className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition disabled:opacity-50"
        >
          <BookmarkIcon isBookmarked={isBookmarked} className="w-5 h-5" />
        </button>
      </div>
      <p className="text-gray-700 leading-relaxed">{description}</p>
      <div className="flex flex-col gap-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <LocationIcon className="w-4 h-4 text-blue-500" /> <span>{location}</span>
        </div>
        <div className="flex items-center gap-2">
          <TimeIcon className="w-4 h-4" /> <span>{eventDate}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags
          .flatMap((tag) =>
            tag.label.split(",").map((subLabel) => ({
              ...tag,
              label: subLabel.trim(),
            }))
          )
          .map((tag, index) => (
            <span 
              key={`${tag.id}-${index}`} 
              className={`px-3 py-1 rounded-full text-xs font-medium ${getTagClasses(tag.type)}`}
            >
              {tag.label}
            </span>
          ))}
      </div>
      <button
        onClick={handleRegisterToggle}
        disabled={registering}
        className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
          registered 
            ? "bg-green-100 text-green-700 hover:bg-green-200" 
            : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
        }`}
      >
        {registering ? "Processing..." : (
          <>
            {registered ? "Registered" : "Register for Event"}
            {registered && <span className="ml-1 text-green-900 font-bold px-1">✕</span>}
          </>
        )}
      </button>
    </article>
  );
};

export default EventCard;