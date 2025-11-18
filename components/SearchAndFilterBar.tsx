"use client";

import React, { useState, FC } from 'react';
import { SearchIcon, SlidersIcon } from "./Icons";

const EventSearchAndFilterBar: FC = () => {
    const [activeTab, setActiveTab] = useState<"all" | "forYou">("forYou");
    const [searchQuery, setSearchQuery] = useState("");

    const activeClasses = (tab: "all" | "forYou") => 
        activeTab === tab 
            ? "bg-blue-100 text-blue-700 font-semibold shadow-inner" 
            : "text-gray-600 hover:bg-gray-50";

    return (
        <div className="flex items-center gap-4 flex-grow max-w-4xl mx-auto">
            {/* Search Input and Filter Button Group */}
            <div className="flex flex-1 items-center gap-2 bg-gray-100 p-2 rounded-xl shadow-inner min-w-0">
                <SearchIcon className="text-gray-400 flex-shrink-0" />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for an event"
                    className="w-full bg-transparent border-0 outline-none focus:outline-none text-gray-700 placeholder-gray-400 text-sm md:text-base min-w-0"
                    aria-label="Search for events"
                />
            </div>
            
            <button
                className="p-3 bg-gray-100 rounded-full flex-shrink-0 hover:bg-gray-200 transition duration-150 shadow-md"
                aria-label="Filter events"
                type="button"
            >
                <SlidersIcon className="text-gray-600" />
            </button>

            {/* Tab Navigation (All Events / For You) */}
            <nav
                className="hidden md:inline-flex h-10 items-center rounded-xl overflow-hidden shadow-md bg-white border border-gray-200 flex-shrink-0"
                role="tablist"
                aria-label="Event filters"
            >
                <button
                    className={`px-4 py-2 text-sm transition duration-150 ${activeClasses("all")} h-full rounded-l-xl`}
                    onClick={() => setActiveTab("all")}
                    role="tab"
                    aria-selected={activeTab === "all"}
                    type="button"
                >
                    All Events
                </button>
                <button
                    className={`px-4 py-2 text-sm transition duration-150 ${activeClasses("forYou")} h-full rounded-r-xl`}
                    onClick={() => setActiveTab("forYou")}
                    role="tab"
                    aria-selected={activeTab === "forYou"}
                    type="button"
                >
                    For You
                </button>
            </nav>
        </div>
    );
};

export default EventSearchAndFilterBar;