
import { prisma } from '@/lib/prisma'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'

export async function GET() {
  try {
    // Get the first user for testing
    const user = await prisma.user.findFirst()
    if (!user) {
      return createApiError('No users found in database', 404)
    }

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
      take: 20,
    })

    // Get total count
    const total = await prisma.contact.count({
      where: { userId: user.id }
    })

    return createApiSuccess({
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
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Test My-500 error:', error)
    return createApiError('Test failed', 500)
  }
} 