import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'
import { Prisma } from '@prisma/client'

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const q = searchParams.get('q') || ''
    const filter = searchParams.get('filter') || ''
    const sort = searchParams.get('sort') || 'warmnessScore'
    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc'

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > MAX_LIMIT) {
      return createApiError('Invalid pagination parameters', 400)
    }

    // Build Prisma query
    const where: Prisma.ContactWhereInput = { userId }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { organisation: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (filter === 'campaign') {
      where.addedToCampaign = true
    }
    // Add more filters as needed

    const orderBy: Prisma.ContactOrderByWithRelationInput = {}
    orderBy[sort as keyof Prisma.ContactOrderByWithRelationInput] = order

    // Count total
    const total = await prisma.contact.count({ where })

    // Query contacts
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        campaigns: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

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
      contacts: result,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return createApiError(errorMessage, 500)
  }
} 