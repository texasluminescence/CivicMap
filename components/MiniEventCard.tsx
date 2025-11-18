import React, { FC, useState } from "react";
import { BookmarkIcon, LocationIcon, TimeIcon } from "./Icons"; // Import Icons

// The Tag interface is defined here and exported for use in other components.
export interface Tag {
  id?: string;
  label: string;
  type?: 'Topic' | 'Tone' | 'Custom'; 
}

interface MiniEventCardProps {
  id: string;
  title: string;
  location: string;
  eventDate: string;
  tags: Tag[];
  imageUrl?: string;
  onClick: (id: string) => void;
  // NEW: Controlled state for bookmark status
  isBookmarked: boolean; 
  // NEW: Handler for bookmark click (uses local state for now, or could be a prop handler)
  // Since MiniEventCard is in a list, we'll keep the state local for demo simplicity
}

const MiniEventCard: FC<MiniEventCardProps> = ({ 
    id, 
    title, 
    location, 
    eventDate, 
    tags, 
    imageUrl, 
    isBookmarked: initialBookmarked, // Rename prop to use internal state
    onClick 
}) => {
  // Use local state for bookmarking in the feed for quick interaction
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents card click event from firing
    // In a real app, this would trigger an API call
    setIsBookmarked((prev) => !prev);
  };

  return (
    <article 
        onClick={() => onClick(id)}
        className="cursor-pointer bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full"
    >
      <div className="relative h-40 bg-gray-100">
        {imageUrl ? (
          // In a real Next.js app, this should use the built-in Image component
          <img src={imageUrl} alt={title} className="object-cover w-full h-full" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
        
        {/* NEW: Bookmark Button */}
        <button
          onClick={handleBookmarkClick}
          className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full hover:bg-white transition-colors"
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          <BookmarkIcon isBookmarked={isBookmarked} className="w-5 h-5" />
        </button>

      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h2 className="text-xl font-semibold text-gray-900 mb-1 line-clamp-2">{title}</h2>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
            <LocationIcon className="w-4 h-4 text-blue-600" />
            <span className="truncate">{location}</span>
        </p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
            <TimeIcon className="w-4 h-4 text-gray-500" />
            <span>{eventDate}</span>
        </p>
        <div className="flex flex-wrap gap-2 mt-auto">
          {tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full"
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