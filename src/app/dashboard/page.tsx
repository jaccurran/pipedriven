import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { PipedriveApiKeyForm } from '@/components/PipedriveApiKeyForm'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get user data with Pipedrive API key
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pipedriveApiKey: true,
      createdAt: true,
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout user={user}>
      <DashboardOverview user={user} />
      
      {/* Pipedrive Integration Section */}
      <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Pipedrive Integration
          </h2>
          
          <PipedriveApiKeyForm 
            userId={user.id}
            currentApiKey={user.pipedriveApiKey}
          />
        </div>
      </div>
    </DashboardLayout>
  )
} 