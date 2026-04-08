"use client";

import React, { FC, useEffect, useRef, useState } from "react";
import { SearchIcon, SlidersIcon } from "./Icons";

type Props = {
  searchQuery: string;
  activeTab: "all" | "forYou";

  topicTags: string[];
  toneTags: string[];

  selectedTopics: string[];
  selectedTones: string[];

  onSearchChange: (value: string) => void;
  onTabChange: (tab: "all" | "forYou") => void;

  onTopicToggle: (tag: string) => void;
  onToneToggle: (tag: string) => void;
};

const SearchAndFilterBar: FC<Props> = ({
  searchQuery,
  activeTab,
  topicTags,
  toneTags,
  selectedTopics,
  selectedTones,
  onSearchChange,
  onTabChange,
  onTopicToggle,
  onToneToggle,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClick);
    }

    return () =>
      document.removeEventListener("mousedown", handleClick);
  }, [isFilterOpen]);

  const activeClasses = (tab: "all" | "forYou") =>
    activeTab === tab
      ? "bg-blue-100 text-blue-700 font-semibold shadow-inner"
      : "text-gray-600 hover:bg-gray-50";

  const hasActiveFilters =
    selectedTopics.length > 0 || selectedTones.length > 0;
  const clearAllFilters = () => {
    selectedTopics.forEach(onTopicToggle);
    selectedTones.forEach(onToneToggle);
  };
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div className="flex items-center gap-4">
        {/* SEARCH */}
        <div className="flex flex-1 items-center gap-2 bg-gray-100 p-2 rounded-xl shadow-inner min-w-0">
          <SearchIcon className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for an event"
            className="w-full bg-transparent border-0 outline-none text-gray-700 placeholder:text-gray-400"
          />
        </div>

        {/* FILTER BUTTON + DROPDOWN */}
        <div className="relative" ref={popupRef}>
          <button
            onClick={() => setIsFilterOpen((v) => !v)}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition ${
              hasActiveFilters
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-label="Filter events"
          >
            <SlidersIcon />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 z-30">
              <div className="w-[min(38vw,300px)] bg-white border rounded-xl shadow-xl flex flex-col max-h-[70vh]">

                {/* SCROLLABLE CONTENT ONLY */}
                <div className="overflow-y-auto p-3 space-y-4">

                  {/* TOPICS */}
                  <div>
                    <p className="bg-gray-100 text-sm font-bold text-gray-600 px-1 mb-1 uppercase">
                      Topics
                    </p>

                    {topicTags.length === 0 && (
                      <p className="text-xs text-gray-400 px-1">
                        No topics
                      </p>
                    )}

                    {topicTags.map((tag) => {
                      const selected = selectedTopics.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => onTopicToggle(tag)}
                          className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                            selected
                              ? "bg-blue-100 text-blue-700 font-semibold"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  {/* TONES */}
                  <div>
                    <p className="bg-gray-100 text-sm font-bold text-gray-600 px-1 mb-1 uppercase">
                      Tone
                    </p>

                    {toneTags.length === 0 && (
                      <p className="text-xs text-gray-400 px-1">
                        No tones
                      </p>
                    )}

                    {toneTags.map((tag) => {
                      const selected = selectedTones.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => onToneToggle(tag)}
                          className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                            selected
                              ? "bg-green-100 text-green-700 font-semibold"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* TABS */}
        <nav className="hidden md:inline-flex h-10 rounded-xl overflow-hidden shadow-md bg-white border">
          <button
            className={`px-5 transition ${activeClasses("all")}`}
            onClick={() => onTabChange("all")}
          >
            All Events
          </button>
          <button
            className={`px-5 transition ${activeClasses("forYou")}`}
            onClick={() => onTabChange("forYou")}
          >
            For You
          </button>
        </nav>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Clear All Button */}
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-gray-500 hover:text-red-600 transition mr-1"
          >
            Clear all 
            <span className="font-bold leading-none"> ×</span>
          </button>

          {selectedTopics.map((tag) => (
            <button
              key={`topic-${tag}`}
              onClick={() => onTopicToggle(tag)}
              className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full hover:bg-blue-200 active:scale-95 transition"
            >
              {tag}
              <span className="font-bold leading-none">×</span>
            </button>
          ))}

          {selectedTones.map((tag) => (
            <button
              key={`tone-${tag}`}
              onClick={() => onToneToggle(tag)}
              className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full hover:bg-green-200 active:scale-95 transition"
            >
              {tag}
              <span className="font-bold leading-none">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilterBar;