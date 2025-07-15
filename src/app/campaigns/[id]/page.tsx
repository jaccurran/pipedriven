import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CampaignContactsWrapper } from '@/components/campaigns/CampaignContactsWrapper'

interface CampaignDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user || !session.user.id) {
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
      lastSyncTimestamp: true,
      syncStatus: true,
      password: true,
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  // Await params for Next.js 15 compatibility
  const { id } = await params

  // Get campaign with user access check
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      users: true,
      contacts: true,
      activities: true,
    },
  })

  if (!campaign) {
    notFound()
    return null
  } else {
    const hasAccess = Array.isArray(campaign.users) && campaign.users.some(campaignUser => campaignUser.id === user.id)
    if (!hasAccess) {
      notFound()
      return null
    }
  }

  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: 'USD',
  //   }).format(amount)
  // }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600">Campaign details and performance</p>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Campaign Information</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-sm text-gray-900">{campaign.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Sector</h3>
                <p className="mt-1 text-sm text-gray-900">{campaign.sector}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Theme</h3>
                <p className="mt-1 text-sm text-gray-900">{campaign.theme}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Target Leads</h3>
                <p className="mt-1 text-sm text-gray-900">{campaign.targetLeads}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(campaign.startDate)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(campaign.endDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Contacts</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{campaign.contacts.length}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Activities</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{campaign.activities.length}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{campaign.status}</p>
          </div>
        </div>

        {/* Campaign Contacts with Action System */}
        <div className="bg-white shadow rounded-lg p-6">
          <CampaignContactsWrapper
            campaign={campaign}
            user={user}
            initialContacts={campaign.contacts}
          />
        </div>
      </div>
    </DashboardLayout>
  )
} 