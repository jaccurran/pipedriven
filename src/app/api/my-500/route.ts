import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession()
    if (!session?.user?.id) {
      return createApiError('Authentication required', 401)
    }
    const userId = session.user.id

    // 2. Parse query params with proper validation
    const { searchParams } = new URL(request.url)
    const page = Math.max(Number(searchParams.get('page')) || 1, 1)
    const limit = Math.max(Math.min(Number(searchParams.get('limit')) || 50, 100), 1)
    // const search = searchParams.get('search')?.toLowerCase() || ''

    // 3. Query contacts with optimized database-level ordering
    const where: Prisma.ContactWhereInput = {
      userId: userId,
      // Add any additional filters here
    };

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        include: {
          campaigns: true,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Only get the most recent activity for performance
          },
          organization: true,
        },
        orderBy: [
          { addedToCampaign: 'desc' },
          { warmnessScore: 'asc' },
          { lastContacted: 'asc' },
          { createdAt: 'desc' }
        ],
      })
    ])

    // 4. Sync status
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const syncStatus = {
      lastSync: user?.lastSyncTimestamp ? user.lastSyncTimestamp.toISOString() : null,
      totalContacts: total,
      syncedContacts: total, // For now, assume all are synced
      pendingSync: false,
      syncInProgress: false,
    }

    // 5. Pagination info
    const totalPages = Math.ceil(total / limit)
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }

    const result = contacts.map((contact: Prisma.ContactGetPayload<{
      include: { campaigns: true; activities: true; organization: true }
    }>) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      organisation: contact.organisation,
      organizationId: contact.organizationId,
      warmnessScore: contact.warmnessScore,
      lastContacted: contact.lastContacted,
      addedToCampaign: contact.addedToCampaign,
      pipedrivePersonId: contact.pipedrivePersonId,
      pipedriveOrgId: contact.pipedriveOrgId,
      lastPipedriveUpdate: contact.lastPipedriveUpdate,
      
      // New Pipedrive fields
      lastActivityDate: contact.lastActivityDate,
      openDealsCount: contact.openDealsCount,
      closedDealsCount: contact.closedDealsCount,
      wonDealsCount: contact.wonDealsCount,
      lostDealsCount: contact.lostDealsCount,
      activitiesCount: contact.activitiesCount,
      emailMessagesCount: contact.emailMessagesCount,
      lastIncomingMailTime: contact.lastIncomingMailTime,
      lastOutgoingMailTime: contact.lastOutgoingMailTime,
      followersCount: contact.followersCount,
      jobTitle: contact.jobTitle,
      
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      userId: contact.userId,
      activities: contact.activities,
      organization: contact.organization,
    }));

    return createApiSuccess({
      contacts: result,
      pagination,
      syncStatus,
      filters: { available: [], applied: [] },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return createApiError(errorMessage, 500)
  }
} 