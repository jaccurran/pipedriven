import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CampaignList } from '@/components/campaigns/CampaignList'
import Link from 'next/link'

export default async function CampaignsPage() {
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

  // Get campaigns for the user
  const campaigns = await prisma.campaign.findMany({
    where: {
      users: {
        some: {
          id: user.id
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600">Manage your lead sourcing campaigns</p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Campaign
          </Link>
        </div>

        {/* Campaigns List */}
        <CampaignList campaigns={campaigns} user={user} />
      </div>
    </DashboardLayout>
  )
} 