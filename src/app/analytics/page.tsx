"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard page, which will handle the analytics route
    router.replace('/dashboard?route=analytics');
  }, [router]);

  return null;
} 