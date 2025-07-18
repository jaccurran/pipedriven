"use client";

import { EnhancedAuthFlow } from "@/components/auth/EnhancedAuthFlow";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function DashboardContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle initial routing based on search params
    const route = searchParams.get('route');
    if (route && ['campaigns', 'my-500', 'analytics'].includes(route)) {
      // Update the URL without triggering a page reload
      const newUrl = `/${route}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
    return null; // This should be handled by EnhancedAuthFlow
  }

  return (
    <EnhancedAuthFlow>
      <DashboardLayout 
        user={{
          id: session.user.id || '',
          name: session.user.name || 'User',
          email: session.user.email || '',
          role: session.user.role || 'CONSULTANT'
        }}
      />
    </EnhancedAuthFlow>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
} 