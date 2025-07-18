"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface AnalyticsContentProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function AnalyticsContent({}: AnalyticsContentProps) {
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

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Analytics Dashboard</h2>
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
} 