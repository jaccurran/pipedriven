import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  try {
    // Auth
    const session = await getServerSession()
    if (!session?.user?.id) {
      return createApiError('Authentication required', 401)
    }
    const userId = session.user.id

    // Parse query params
    const { searchParams } = new URL(request.url)
    let page = parseInt(searchParams.get('page') || `${DEFAULT_PAGE}`)
    let limit = parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`)
    const q = searchParams.get('q') || ''
    const filter = searchParams.get('filter') || ''
    const sort = searchParams.get('sort') || 'warmnessScore'
    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc'

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > MAX_LIMIT) {
      return createApiError('Invalid pagination parameters', 400)
    }

    // Build Prisma query
    const where: any = { userId }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { organization: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }
    if (filter === 'campaign') {
      where.addedToCampaign = true
    }
    // Add more filters as needed

    const orderBy: any = {}
    orderBy[sort] = order

    // Count total
    const total = await prisma.contact.count({ where })

    // Query contacts
    const contacts = await prisma.contact.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { 
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        organization: true 
      },
    })

    // Pagination info
    const totalPages = Math.ceil(total / limit)
    const hasMore = page * limit < total

    // Search stats
    const searchStats = {
      query: q,
      totalResults: total,
      searchTime: 0, // Could add timing if needed
    }

    return createApiSuccess({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
        hasPrev: page > 1,
      },
      searchStats,
    })
  } catch (err: any) {
    return createApiError(err.message || 'Server error', 500)
  }
} 