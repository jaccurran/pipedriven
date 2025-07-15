import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'

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
    const search = searchParams.get('search')?.toLowerCase() || ''

    // 3. Query contacts with optimized database-level ordering
    let where: any = { userId }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        include: { 
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          organization: true 
        },
        orderBy: [
          { addedToCampaign: 'desc' },
          { warmnessScore: 'asc' },
          { lastContacted: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
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

    return createApiSuccess({
      contacts,
      pagination,
      syncStatus,
      filters: { available: [], applied: [] },
    })
  } catch (error: any) {
    return createApiError(error.message || 'Internal server error', 500)
  }
} 