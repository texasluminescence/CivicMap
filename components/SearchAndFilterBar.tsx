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
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeClasses = (tab: "all" | "forYou") =>
    activeTab === tab
      ? "bg-blue-100 text-blue-700 font-semibold shadow-inner"
      : "text-gray-600 hover:bg-gray-50";

  const hasActiveFilters =
    selectedTopics.length > 0 || selectedTones.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3 shadow-inner">
          <SearchIcon className="flex-shrink-0 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for an event"
            className="w-full bg-transparent border-0 outline-none text-gray-700 placeholder:text-gray-400"
          />
        </div>

        <div className="relative" ref={filterRef}>
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
            <div className="absolute right-0 top-14 z-30 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="max-h-[420px] overflow-y-auto p-4">
                <div className="mb-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Topics
                  </p>

                  {topicTags.length === 0 && (
                    <p className="text-xs text-gray-400">No topics</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {topicTags.map((tag) => {
                      const selected = selectedTopics.includes(tag);

                      return (
                        <button
                          key={tag}
                          onClick={() => onTopicToggle(tag)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            selected
                              ? "border-blue-200 bg-blue-100 text-blue-700 font-semibold"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tone
                  </p>

                  {toneTags.length === 0 && (
                    <p className="text-xs text-gray-400">No tones</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {toneTags.map((tag) => {
                      const selected = selectedTones.includes(tag);

                      return (
                        <button
                          key={tag}
                          onClick={() => onToneToggle(tag)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            selected
                              ? "border-green-200 bg-green-100 text-green-700 font-semibold"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <button
                    onClick={() => {
                      selectedTopics.forEach((tag) => onTopicToggle(tag));
                      selectedTones.forEach((tag) => onToneToggle(tag));
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="hidden h-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:inline-flex">
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

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedTopics.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {tag}
            </span>
          ))}

          {selectedTones.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
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