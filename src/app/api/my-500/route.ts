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
        },
        orderBy: {
          createdAt: 'desc',
        },
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
      include: { campaigns: true }
    }>) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      organization: contact.organisation,
      addedToCampaign: contact.addedToCampaign,
      warmnessScore: contact.warmnessScore,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      campaigns: contact.campaigns,
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