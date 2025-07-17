import { prisma } from '@/lib/prisma'
import type { Contact, Activity, Campaign, ActivityType, User, Prisma } from '@prisma/client'

export interface CreateContactData {
  name: string
  email?: string
  phone?: string
  organisation?: string
  warmnessScore?: number
  lastContacted?: Date
  addedToCampaign?: boolean
  pipedrivePersonId?: string
  pipedriveOrgId?: string
  userId: string
}

export interface UpdateContactData {
  name?: string
  email?: string
  phone?: string
  organisation?: string
  warmnessScore?: number
  lastContacted?: Date
  addedToCampaign?: boolean
  pipedrivePersonId?: string
  pipedriveOrgId?: string
}

export interface GetContactsOptions {
  page?: number
  limit?: number
  userId?: string
  name?: string
  email?: string
  organisation?: string
  minWarmnessScore?: number
  maxWarmnessScore?: number
  campaignId?: string
  addedToCampaign?: boolean
  query?: string // Search query for name, email, organisation
  sortBy?: 'name' | 'createdAt' | 'warmnessScore' | 'lastContacted'
  sortOrder?: 'asc' | 'desc'
  country?: string // Filter by organization country
  sector?: string // Filter by organization industry/sector
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface GetContactsResult {
  contacts: Contact[]
  pagination: PaginationInfo
}

export interface ContactAnalytics {
  totalActivities: number
  activityBreakdown: Record<ActivityType, number>
  lastActivityDate: Date | null
  averageWarmnessScore: number
  campaignsCount: number
}

export interface ContactPerformance {
  totalActivities: number
  activitiesThisMonth: number
  activitiesThisWeek: number
  responseRate: number
  averageResponseTime: number
  lastActivityType: ActivityType | null
  engagementScore: number
}

export interface SearchContactsOptions {
  query?: string
  sector?: string
  minWarmnessScore?: number
  maxWarmnessScore?: number
  addedToCampaign?: boolean
  page?: number
  limit?: number
  userId?: string
}

export class ContactService {
  async createContact(data: CreateContactData): Promise<Contact> {
    return await prisma.contact.create({
      data,
    })
  }

  async getContacts(options: GetContactsOptions = {}): Promise<GetContactsResult> {
    const { 
      page = 1, 
      limit = 10, 
      userId,
      name,
      email,
      organisation,
      minWarmnessScore,
      maxWarmnessScore,
      campaignId,
      addedToCampaign,
      query,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      country,
      sector
    } = options
    
    const skip = (page - 1) * limit

    const where: Prisma.ContactWhereInput = {}
    
    if (userId) {
      where.userId = userId
    }
    
    // Handle search query
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { organisation: { contains: query, mode: 'insensitive' } },
      ]
    } else {
      // Individual field searches
      if (name) {
        where.name = { contains: name, mode: 'insensitive' }
      }
      
      if (email) {
        where.email = { contains: email, mode: 'insensitive' }
      }
      
      if (organisation) {
        where.organisation = { contains: organisation, mode: 'insensitive' }
      }
    }
    
    if (minWarmnessScore !== undefined || maxWarmnessScore !== undefined) {
      where.warmnessScore = {}
      if (minWarmnessScore !== undefined) {
        where.warmnessScore.gte = minWarmnessScore
      }
      if (maxWarmnessScore !== undefined) {
        where.warmnessScore.lte = maxWarmnessScore
      }
    }
    
    if (campaignId) {
      where.campaigns = { some: { id: campaignId } }
    }
    
    if (addedToCampaign !== undefined) {
      where.addedToCampaign = addedToCampaign
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

    // Handle sorting
    const orderBy: Prisma.ContactOrderByWithRelationInput = {}
    orderBy[sortBy] = sortOrder

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.contact.count({ where }),
    ])

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getContactById(id: string): Promise<Contact & {
    activities: Activity[]
    campaigns: Campaign[]
    user: User
  } | null> {
    return await prisma.contact.findUnique({
      where: { id },
      include: {
        activities: true,
        campaigns: true,
        user: true,
      },
    })
  }

  async updateContact(id: string, data: UpdateContactData): Promise<Contact> {
    return await prisma.contact.update({
      where: { id },
      data,
    })
  }

  async deleteContact(id: string): Promise<Contact> {
    return await prisma.contact.delete({
      where: { id },
    })
  }

  async assignContactToCampaigns(contactId: string, campaignIds: string[]): Promise<Contact & { campaigns: Campaign[] }> {
    return await prisma.contact.update({
      where: { id: contactId },
      data: {
        campaigns: {
          connect: campaignIds.map(id => ({ id })),
        },
      },
      include: {
        campaigns: true,
      },
    })
  }

  async removeContactFromCampaigns(contactId: string, campaignIds: string[]): Promise<Contact & { campaigns: Campaign[] }> {
    return await prisma.contact.update({
      where: { id: contactId },
      data: {
        campaigns: {
          disconnect: campaignIds.map(id => ({ id })),
        },
      },
      include: {
        campaigns: true,
      },
    })
  }

  async getContactAnalytics(contactId: string): Promise<ContactAnalytics> {
    const [activities, contact] = await Promise.all([
      prisma.activity.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.findUnique({
        where: { id: contactId },
        include: { campaigns: true },
      }),
    ])

    const activityBreakdown: Record<ActivityType, number> = {
      EMAIL: 0,
      CALL: 0,
      MEETING: 0,
      LINKEDIN: 0,
      REFERRAL: 0,
      CONFERENCE: 0,
    }

    activities.forEach(activity => {
      activityBreakdown[activity.type]++
    })

    const lastActivityDate = activities.length > 0 ? activities[0].createdAt : null
    const averageWarmnessScore = contact?.warmnessScore || 0
    const campaignsCount = contact?.campaigns.length || 0

    return {
      totalActivities: activities.length,
      activityBreakdown,
      lastActivityDate,
      averageWarmnessScore,
      campaignsCount,
    }
  }

  async searchContacts(options: SearchContactsOptions = {}): Promise<GetContactsResult> {
    const { 
      query,
      minWarmnessScore,
      maxWarmnessScore,
      addedToCampaign,
      page = 1,
      limit = 10,
      userId
    } = options
    
    const skip = (page - 1) * limit

    const where: Prisma.ContactWhereInput = {}
    
    if (userId) {
      where.userId = userId
    }
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { organisation: { contains: query, mode: 'insensitive' } },
      ]
    }
    
    if (minWarmnessScore !== undefined) {
      where.warmnessScore = { gte: minWarmnessScore }
    }
    
    if (maxWarmnessScore !== undefined) {
      if (where.warmnessScore && typeof where.warmnessScore === 'object') {
        where.warmnessScore.lte = maxWarmnessScore
      } else {
        where.warmnessScore = { lte: maxWarmnessScore }
      }
    }
    
    if (addedToCampaign !== undefined) {
      where.addedToCampaign = addedToCampaign
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ])

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getContactPerformance(contactId: string): Promise<ContactPerformance> {
    const activities = await prisma.activity.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const activitiesThisWeek = activities.filter(activity => 
      activity.createdAt >= oneWeekAgo
    ).length

    const activitiesThisMonth = activities.filter(activity => 
      activity.createdAt >= oneMonthAgo
    ).length

    const lastActivityType = activities.length > 0 ? activities[0].type : null

    // Calculate engagement score based on activity frequency and recency
    let engagementScore = 0
    if (activities.length > 0) {
      const daysSinceLastActivity = Math.floor(
        (now.getTime() - activities[0].createdAt.getTime()) / (24 * 60 * 60 * 1000)
      )
      engagementScore = Math.max(0, 100 - daysSinceLastActivity * 2 + activitiesThisMonth * 5)
    }

    return {
      totalActivities: activities.length,
      activitiesThisMonth,
      activitiesThisWeek,
      responseRate: 0, // Would need to track responses separately
      averageResponseTime: 0, // Would need to track response times separately
      lastActivityType,
      engagementScore,
    }
  }
} 