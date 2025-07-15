import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { My500Client } from '@/components/contacts/My500Client'

export default async function My500PageServer() {
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
      lastSyncTimestamp: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
      image: true,
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch data directly from database instead of API call
  let initialData = null
  let error = null

  try {
    // Get contacts with activities
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      include: { activities: true },
      orderBy: [
        { addedToCampaign: 'desc' },
        { warmnessScore: 'asc' },
        { lastContacted: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 20, // Default limit
    })

    // Get total count
    const total = await prisma.contact.count({
      where: { userId: user.id }
    })

    initialData = {
      contacts,
      pagination: {
        page: 1,
        limit: 20,
        total,
        totalPages: Math.ceil(total / 20),
        hasMore: total > 20,
        hasPrev: false,
      },
      syncStatus: {
        lastSync: user.lastSyncTimestamp?.toISOString() || null,
        totalContacts: total,
        syncedContacts: total,
        pendingSync: false,
        syncInProgress: false,
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load contacts'
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Contacts</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My-500</h1>
            <p className="text-gray-600">Your prioritized contacts from Pipedrive</p>
          </div>
        </div>

        {/* My-500 Client Component */}
        <My500Client 
          initialContacts={initialData?.contacts || []}
          initialPagination={initialData?.pagination}
          initialSyncStatus={initialData?.syncStatus}
          user={user}
        />
      </div>
    </DashboardLayout>
  )
} 