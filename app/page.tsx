// app/page.tsx
import AuthScreen from "@/components/AuthScreen";

export default function HomePage() {
  return <AuthScreen />;
}

/*
"use client"; // must be at the top for client-side hooks

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthScreen from "@/components/AuthScreen";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("civicmap_token");
    if (token) {
      // If the user is logged in, send them to /events (feed page)
      router.push("/events");
    }
  }, [router]);

  // Always render AuthScreen if not redirected
  return <AuthScreen />;
}

*/
