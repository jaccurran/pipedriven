import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { NewCampaignForm } from '@/components/campaigns/NewCampaignForm'

export default async function NewCampaignPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pipedriveApiKey: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
      image: true,
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
          <p className="text-gray-600">Create a new lead sourcing campaign</p>
        </div>

        {/* Campaign Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <NewCampaignForm user={user} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 