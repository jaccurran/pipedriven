"use client";

import { useState, useEffect } from "react";
import { CampaignList } from "./CampaignList";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Campaign } from "@prisma/client";

interface CampaignsContentProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function CampaignsContent({ user }: CampaignsContentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/campaigns');
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data.campaigns || []);
        } else {
          setError('Failed to fetch campaigns');
        }
      } catch {
        setError('Failed to fetch campaigns');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <CampaignList 
      campaigns={campaigns} 
      user={user as { id: string; name: string; email: string; role: 'CONSULTANT' | 'GOLDEN_TICKET'; pipedriveApiKey: string | null; pipedriveUserId: number | null; lastSyncTimestamp: Date | null; syncStatus: string; createdAt: Date; updatedAt: Date; emailVerified: Date | null; image: string | null; quickActionMode: 'SIMPLE' | 'DETAILED'; emailNotifications: boolean; activityReminders: boolean; campaignUpdates: boolean; syncStatusAlerts: boolean }} 
    />
  );
} 