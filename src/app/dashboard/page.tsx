import { EnhancedAuthFlow } from "@/components/auth/EnhancedAuthFlow";
import { DashboardWrapper } from "@/components/dashboard/DashboardWrapper";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null; // This should be handled by EnhancedAuthFlow
  }

  return (
    <EnhancedAuthFlow>
      <DashboardLayout 
        user={{
          name: session.user.name || 'User',
          email: session.user.email || '',
          role: session.user.role || 'CONSULTANT'
        }}
      >
        <DashboardWrapper 
          user={{
            id: session.user.id,
            name: session.user.name || 'User',
            email: session.user.email || '',
            role: session.user.role as UserRole || 'CONSULTANT',
            pipedriveApiKey: session.user.pipedriveApiKey || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            password: null,
            lastSyncTimestamp: null,
            syncStatus: 'IDLE',
            emailVerified: null,
            image: null
          }} 
        />
      </DashboardLayout>
    </EnhancedAuthFlow>
  );
} 