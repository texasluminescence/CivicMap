"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientAuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Check if window exists (client-side)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("civicmap_token");
      
      if (!token) {
        router.push("/auth");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [router]);

  // 2. Prevent "Flicker": Don't show children until we know they are logged in
  if (!isAuthorized) {
    return <div className="h-screen w-full bg-gray-50" />; // Or a loading spinner
  }

  return <>{children}</>;
}
