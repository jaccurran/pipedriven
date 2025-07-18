"use client";

import { useState, useEffect } from "react";
import { DashboardOverview } from "./DashboardOverview";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface DashboardContentProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function DashboardContent({ user }: DashboardContentProps) {
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

  return <DashboardOverview user={user as { name: string; role: string }} />;
} 