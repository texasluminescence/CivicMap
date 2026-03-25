"use client";

import { useRouter, usePathname } from "next/navigation";
import { CompassIcon, UserIcon } from "@/components/Icons";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname(); // get current path

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-xl">
      <div className="flex justify-around py-3">
        {/* Explore / Events */}
        <button
          onClick={() => router.push("/events")}
          className={`flex flex-col items-center transition hover:scale-105 ${
            pathname?.startsWith("/events")
              ? "text-blue-700"
              : "text-gray-500"
          }`}
        >
          <CompassIcon />
          <span className="text-xs font-medium">Explore</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => router.push("/profile")}
          className={`flex flex-col items-center transition hover:scale-105 ${
            pathname === "/profile" ? "text-blue-700" : "text-gray-500"
          }`}
        >
          <UserIcon />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
}
