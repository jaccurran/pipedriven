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
    const country = searchParams.get('country') || ''
    const sector = searchParams.get('sector') || ''
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
    
    // Handle organization filters
    if (country || sector) {
      where.organization = {}
      if (country) {
        where.organization.country = { contains: country, mode: 'insensitive' }
      }
      if (sector) {
        where.organization.industry = { contains: sector, mode: 'insensitive' }
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.ContactOrderByWithRelationInput = {}
    
    // Map sort fields to valid Prisma fields
    switch (sort) {
      case 'warmnessScore':
        orderBy.warmnessScore = order
        break
      case 'lastContacted':
        orderBy.lastContacted = order
        break
      case 'createdAt':
        orderBy.createdAt = order
        break
      case 'addedToCampaign':
        orderBy.addedToCampaign = order
        break
      default:
        orderBy.warmnessScore = order
    }

    // Count total
    const total = await prisma.contact.count({ where })

    // Query contacts
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        campaigns: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Only get the most recent activity for performance
        },
        organization: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

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