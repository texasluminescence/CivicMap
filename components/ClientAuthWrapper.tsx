"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_ROUTES = ["/", "/auth"];

export default function ClientAuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith("/auth/")
  );

  useEffect(() => {
    if (isPublicRoute) {
      setIsAuthorized(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth");
      } else {
        setIsAuthorized(true);
      }
    });
  }, [router, pathname, isPublicRoute]);

  if (!isAuthorized) {
    return <div className="h-screen w-full bg-gray-50" />;
  }

  return <>{children}</>;
}
