"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CampaignsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard page, which will handle the campaigns route
    router.replace('/dashboard?route=campaigns');
  }, [router]);

  return null;
} 