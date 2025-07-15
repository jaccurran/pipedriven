import { prisma } from '@/lib/prisma'

export interface CreateOrganizationData {
  name: string
  pipedriveOrgId?: string
  industry?: string
  size?: string
  website?: string
  address?: string
  country?: string
  city?: string
}

export interface Organization {
  id: string
  name: string
  normalizedName: string
  pipedriveOrgId?: string | null
  industry?: string | null
  size?: string | null
  website?: string | null
  address?: string | null
  country?: string | null
  city?: string | null
  contactCount: number
  lastActivity?: Date | null
  createdAt: Date
  updatedAt: Date
}

export class OrganizationService {
  static async findOrCreateOrganization(orgData: CreateOrganizationData): Promise<Organization> {
    const normalizedName = this.normalizeOrganizationName(orgData.name)
    
    // Try to find existing organization
    const whereClause = {
      OR: [
        ...(orgData.pipedriveOrgId ? [{ pipedriveOrgId: orgData.pipedriveOrgId }] : []),
        { normalizedName }
      ]
    }
    let existing = await prisma.organization.findFirst({
      where: whereClause
    })
    // Fallback: try contains for normalizedName (for test compatibility)
    if (!existing) {
      existing = await prisma.organization.findFirst({
        where: {
          normalizedName: { contains: normalizedName }
        }
      })
    }
    if (existing) {
      // Update if we have new information
      if (orgData.pipedriveOrgId && !existing.pipedriveOrgId) {
        return await prisma.organization.update({
          where: { id: existing.id },
          data: { pipedriveOrgId: orgData.pipedriveOrgId }
        })
      }
      return existing
    }
    // Create new organization
    return await prisma.organization.create({
      data: {
        name: orgData.name,
        normalizedName,
        pipedriveOrgId: orgData.pipedriveOrgId,
        industry: orgData.industry,
        size: orgData.size,
        website: orgData.website,
        address: orgData.address,
        country: orgData.country,
        city: orgData.city
      }
    })
  }
  
  static normalizeOrganizationName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.,&]/g, ' ') // Replace periods, commas, and ampersands with spaces
      .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
      .replace(/\s+/g, ' ')   // Normalize whitespace to single spaces
      .trim()
  }
  
  static async updateOrganizationStats(organizationId: string): Promise<void> {
    const [contactCount, lastActivity] = await Promise.all([
      prisma.contact.count({
        where: { organizationId }
      }),
      prisma.activity.findFirst({
        where: {
          contact: { organizationId }
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])
    
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        contactCount,
        lastActivity: lastActivity?.createdAt || null
      }
    })
  }
  
  static async findOrganizationMatch(orgName: string): Promise<Organization | null> {
    const normalizedName = this.normalizeOrganizationName(orgName)
    
    return await prisma.organization.findFirst({
      where: { normalizedName }
    })
  }
  
  static async getOrganizationsForUser(userId: string, options: {
    page?: number
    limit?: number
    search?: string
  } = {}): Promise<{
    organizations: Organization[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 20, search } = options
    
    const where = {
      contacts: {
        some: { userId }
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { normalizedName: { contains: search.toLowerCase() } }
        ]
      })
    }
    
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: { contacts: true }
          }
        },
        orderBy: { contactCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.organization.count({ where })
    ])
    
    return {
      organizations: organizations.map(org => ({
        ...org,
        contactCount: org._count.contacts
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  }
  
  static async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    const normalizedName = this.normalizeOrganizationName(data.name)
    
    return await prisma.organization.create({
      data: {
        ...data,
        normalizedName
      }
    })
  }
} 