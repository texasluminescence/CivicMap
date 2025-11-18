"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation"; // Import useRouter
import { supabase } from "../../../lib/supabaseClient";
import EventCard from "../../../components/EventCard";
import { Tag } from "../../../components/MiniEventCard";
import { ArrowLeftIcon, CompassIcon, UserIcon } from "../../../components/Icons";
import SearchAndFilterBar from "../../../components/SearchAndFilterBar";

interface DetailedEvent {
  id: string;
  title: string;
  location: string;
  event_date: string | null; 
  description: string;
  image_url: string | null;
  tone: string | null; // Actual column name from DB (assuming string)
  tags: Tag[]; // For component usage
}

const formatEventDate = (dateString: string | null): string => {
  if (!dateString) return "Date/Time N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    // Using simple formatting that works for dates/times
    return date.toLocaleString();
  } catch (e) {
    console.error("Failed to parse date:", dateString, e);
    return "Invalid Date";
  }
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter(); // Initialize useRouter hook
  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false); 
  const [loading, setLoading] = useState(true);

  // 1. Fetch Event Details (No user fetch needed)
  useEffect(() => {
    if (!id) {
        setLoading(false);
        return;
    }
    
    const fetchData = async () => {
      setLoading(true);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`*, tone, event_date`) 
        .eq("id", id)
        .single();

      if (eventError) {
        console.error("Error fetching event:", eventError.message);
        setLoading(false);
        return;
      }
      
      const toneString = eventData.tone || "";
      const labels = typeof toneString === 'string' && toneString.trim() !== ''
          ? toneString.split(',').map(s => s.trim()).filter(s => s.length > 0)
          : [];

      const tags: Tag[] = labels.map((label: string, index: number) => ({
        id: `tag-${index}`, // Placeholder ID
        label: label,
        type: 'Custom', // Default type
      }));

      setEvent({
        ...eventData,
        tags,
      } as DetailedEvent);

      setLoading(false);
    };

    fetchData();
  }, [id]); 

  // 2. Bookmark Toggle Handler (Local Only)
  const handleBookmarkToggle = useCallback(async (newState: boolean) => {
    if (!id) return;
    
    // Toggle the local state and log the action
    setIsBookmarked(newState); 
    console.log(`Bookmark status locally toggled to: ${newState} for event ID: ${id}. This change is NOT saved to the database.`);


  }, [id]);


  if (loading || !event) return <p className="p-10 text-gray-500">Loading event details...</p>;

  const formattedEventDate = formatEventDate(event.event_date);

  return (
    // Adjust the main container for positioning the button
    <div className="min-h-screen bg-gray-50 flex flex-col">
            
            {/* Top Navigation */}
            <header className="bg-white shadow-md px-4 py-3 flex justify-center items-center sticky top-0 z-10">
                <img
                    src="/1.png" 
                    alt="CivicMap Logo - Get Involved"
                    className="h-12 w-auto mr-4"     
                />
                <SearchAndFilterBar />
            </header>  
      {/* BACK BUTTON - top-left */}
      <button 
        onClick={() => router.back()} // Use router.back() for navigation
        className="absolute top-20 left-6 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-20"
        aria-label="Go back to previous page"
      >
        <ArrowLeftIcon className="w-6 h-6 text-gray-800" />
      </button>

      {/* Center the EventCard and give it top margin to avoid collision with the back button */}
      <div className="mt-20 w-full flex justify-center">
        <EventCard
          title={event.title}
          location={event.location}
          eventDate={formattedEventDate}
          description={event.description}
          tags={event.tags}
          imageUrl={event.image_url ?? undefined}
          // Controlled props
          isBookmarked={isBookmarked}
          userId={null} 
          eventId={event.id}
          onBookmarkToggle={handleBookmarkToggle}
        />
      </div>

      {/* BOTTOM NAVIGATION BAR */}
            <nav className="flex w-full justify-around bg-white border-t border-gray-200 py-4 shadow-xl fixed bottom-0 z-30">
                <button 
                    onClick={() => router.back()}
                    className="flex flex-col items-center text-blue-700 transition duration-150 transform hover:scale-105" aria-label="Explore Tab">
                    <CompassIcon />
                    <span className="text-sm font-medium">Explore</span>
                </button>
                <button className="flex flex-col items-center text-gray-500 transition duration-150 transform hover:scale-105" aria-label="Profile Tab">
                    <UserIcon />
                    <span className="text-sm font-medium">Profile</span>
                </button>
            </nav>
        </div> 
  );
}