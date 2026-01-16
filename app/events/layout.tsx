// app/events/layout.tsx
"use client";

import React from "react";
import BottomNav from "@/components/BottomNav";

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Page Content */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Sticky Bottom Nav */}
      <BottomNav />
    </div>
  );
}
