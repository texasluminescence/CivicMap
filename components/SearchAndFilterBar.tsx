"use client";

import React, { FC, useState } from "react";
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

  const activeClasses = (tab: "all" | "forYou") =>
    activeTab === tab
      ? "bg-blue-100 text-blue-700 font-semibold shadow-inner"
      : "text-gray-600 hover:bg-gray-50";

  const hasActiveFilters =
    selectedTopics.length > 0 || selectedTones.length > 0;

  return (
    <div className="flex flex-col gap-2 flex-grow max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex flex-1 items-center gap-2 bg-gray-100 p-2 rounded-xl shadow-inner min-w-0">
          <SearchIcon className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for an event"
            className="w-full bg-transparent border-0 outline-none text-gray-700"
          />
        </div>

        {/* Filter Button */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen((v) => !v)}
            className={`p-3 rounded-full shadow-md transition ${
              hasActiveFilters
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            aria-label="Filter events"
          >
            <SlidersIcon />
          </button>

          {/* Dropdown */}
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto bg-white border rounded-xl shadow-xl z-30 p-3 space-y-4">
              {/* TOPICS */}
              <div>
                <p className="bg-gray-100 text-s font-bold text-gray-600 px-1 mb-1 uppercase">
                  Topics
                </p>

                {topicTags.length === 0 && (
                  <p className="text-xs text-gray-400 px-1">No topics</p>
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
                <p className="bg-gray-100 text-s font-bold text-gray-600 px-1 mb-1 uppercase">
                  Tone
                </p>

                {toneTags.length === 0 && (
                  <p className="text-xs text-gray-400 px-1">No tones</p>
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
          )}
        </div>

        {/* Tabs */}
        <nav className="hidden md:inline-flex h-10 rounded-xl overflow-hidden shadow-md bg-white border">
          <button
            className={`px-4 ${activeClasses("all")}`}
            onClick={() => onTabChange("all")}
          >
            All Events
          </button>
          <button
            className={`px-4 ${activeClasses("forYou")}`}
            onClick={() => onTabChange("forYou")}
          >
            For You
          </button>
        </nav>
      </div>

       <nav className="flex md:hidden h-10 rounded-xl overflow-hidden shadow-md bg-white border w-full">
        <button className={`flex-1 ${activeClasses("all")}`} onClick={() => onTabChange("all")}>
          All Events
        </button>
        <button className={`flex-1 ${activeClasses("forYou")}`} onClick={() => onTabChange("forYou")}>
          For You
        </button>
      </nav>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedTopics.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}

          {selectedTones.map((tag) => (
            <span
              key={tag}
              className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilterBar;
