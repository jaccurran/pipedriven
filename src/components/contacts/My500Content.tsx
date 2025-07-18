"use client";

import { useState, useEffect } from "react";
import { My500Client } from "./My500Client";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface My500ContentProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function My500Content({ user }: My500ContentProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <My500Client user={user as { id: string; name: string; email: string; role: 'CONSULTANT' | 'GOLDEN_TICKET'; createdAt: Date; updatedAt: Date; password: string | null; pipedriveApiKey: string | null; lastSyncTimestamp: Date | null; syncStatus: string; emailVerified: Date | null; image: string | null }} initialContacts={[]} />;
} 