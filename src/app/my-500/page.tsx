"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function My500Page() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard page, which will handle the my-500 route
    router.replace('/dashboard?route=my-500');
  }, [router]);

  return null;
} 