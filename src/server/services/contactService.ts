import { prisma } from '@/lib/prisma'
import type { Contact, Activity, Campaign, ActivityType, User, Prisma } from '@prisma/client'
import { createPipedriveService } from './pipedriveService'

export interface CreateContactData {
  name: string
  email?: string
  phone?: string
  organisation?: string
  organizationId?: string
  warmnessScore?: number
  lastContacted?: Date
  addedToCampaign?: boolean
  pipedrivePersonId?: string
  pipedriveOrgId?: string
  lastPipedriveUpdate?: Date
  
  // New Pipedrive fields
  lastActivityDate?: Date
  openDealsCount?: number
  closedDealsCount?: number
  wonDealsCount?: number
  lostDealsCount?: number
  activitiesCount?: number
  emailMessagesCount?: number
  lastIncomingMailTime?: Date
  lastOutgoingMailTime?: Date
  followersCount?: number
  jobTitle?: string
  
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

export interface DeactivateOptions {
  reason?: string
  removeFromSystem?: boolean
  syncToPipedrive?: boolean
}

export interface ReactivateOptions {
  reason?: string
  syncToPipedrive?: boolean
}

export interface DeactivateResult {
  success: boolean
  data?: {
    contactId: string
    pipedriveUpdated: boolean
    localUpdated: boolean
    activityId?: string
  }
  error?: string
}

export interface ReactivateResult {
  success: boolean
  data?: {
    contactId: string
    pipedriveUpdated: boolean
    localUpdated: boolean
    activityId?: string
  }
  error?: string
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
  isActive?: boolean // Filter by active status
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
      sector,
      isActive = true // Default to active contacts only
    } = options
    
    const skip = (page - 1) * limit

    const where: Prisma.ContactWhereInput = {}
    
    if (userId) {
      where.userId = userId
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive
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
    const [contact, activities] = await Promise.all([
      prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          activities: true,
          campaigns: true,
        },
      }),
      prisma.activity.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!contact) {
      throw new Error('Contact not found')
    }

    const activityBreakdown: Record<ActivityType, number> = {
      CALL: 0,
      EMAIL: 0,
      MEETING: 0,
      MEETING_REQUEST: 0,
      LINKEDIN: 0,
      REFERRAL: 0,
      CONFERENCE: 0,
    }

    activities.forEach(activity => {
      activityBreakdown[activity.type]++
    })

    const lastActivityDate = activities.length > 0 ? activities[0].createdAt : null

    return {
      totalActivities: activities.length,
      activityBreakdown,
      lastActivityDate,
      averageWarmnessScore: contact.warmnessScore,
      campaignsCount: contact.campaigns.length,
    }
  }

  async searchContacts(options: SearchContactsOptions = {}): Promise<GetContactsResult> {
    const { 
      query, 
      sector, 
      minWarmnessScore, 
      maxWarmnessScore, 
      addedToCampaign, 
      page = 1, 
      limit = 10,
      userId 
    } = options

    const skip = (page - 1) * limit

    const where: Prisma.ContactWhereInput = {
      isActive: true, // Only search active contacts
    }

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

    if (sector) {
      where.organization = {
        industry: { contains: sector, mode: 'insensitive' }
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
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [activities, contact] = await Promise.all([
      prisma.activity.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.findUnique({
        where: { id: contactId },
      }),
    ])

    if (!contact) {
      throw new Error('Contact not found')
    }

    const activitiesThisMonth = activities.filter(
      activity => activity.createdAt >= startOfMonth
    ).length

    const activitiesThisWeek = activities.filter(
      activity => activity.createdAt >= startOfWeek
    ).length

    const lastActivityType = activities.length > 0 ? activities[0].type : null

    // Calculate engagement score based on activity frequency and recency
    const daysSinceLastActivity = activities.length > 0 
      ? Math.floor((now.getTime() - activities[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity

    const engagementScore = Math.max(0, 100 - (daysSinceLastActivity * 2) + (activities.length * 5))

    return {
      totalActivities: activities.length,
      activitiesThisMonth,
      activitiesThisWeek,
      responseRate: 0, // Would need to track responses
      averageResponseTime: 0, // Would need to track response times
      lastActivityType,
      engagementScore: Math.min(100, Math.max(0, engagementScore)),
    }
  }

  async deactivateContact(
    contactId: string, 
    userId: string, 
    options: DeactivateOptions = {}
  ): Promise<DeactivateResult> {
    const { reason = 'Removed by user via My-500', removeFromSystem = false, syncToPipedrive = true } = options

    try {
      // 1. Validate contact exists and user has permission
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId: userId
        }
      })

      if (!contact) {
        return {
          success: false,
          error: 'Contact not found'
        }
      }

      // 2. Check if contact can be deactivated
      if (!contact.isActive) {
        return {
          success: false,
          error: 'Contact is already inactive'
        }
      }

      // 3. Check for pending activities (activities with future due dates)
      const pendingActivities = await prisma.activity.findMany({
        where: {
          contactId: contactId,
          dueDate: {
            gte: new Date()
          }
        }
      })

      if (pendingActivities.length > 0) {
        return {
          success: false,
          error: 'Cannot deactivate contact with pending activities'
        }
      }

      // 4. Update Pipedrive if requested and contact has Pipedrive ID
      let pipedriveUpdated = false
      if (syncToPipedrive && contact.pipedrivePersonId) {
        const pipedriveService = await createPipedriveService(userId)
        
        if (!pipedriveService) {
          return {
            success: false,
            error: 'Failed to create Pipedrive service - check API key configuration'
          }
        }

        const pipedriveResult = await pipedriveService.deactivateContact(
          parseInt(contact.pipedrivePersonId)
        )
        
        if (!pipedriveResult.success) {
          return {
            success: false,
            error: `Failed to update Pipedrive: ${pipedriveResult.error}`
          }
        }
        
        pipedriveUpdated = true
      }

      // 5. Update local contact
      const updateData: Prisma.ContactUpdateInput = {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        deactivationReason: reason
      }

      if (removeFromSystem) {
        // Soft delete - mark as deleted (deletedAt field not in schema, using deactivatedAt instead)
        updateData.deactivatedAt = new Date()
      }

      await prisma.contact.update({
        where: { id: contactId },
        data: updateData
      })

      // 6. Create system activity for audit
      const activity = await prisma.activity.create({
        data: {
          type: 'EMAIL', // Use a generic type for system activities
          subject: 'Contact Deactivated',
          note: `Contact ${contact.name} was deactivated. Reason: ${reason}`,
          userId: userId,
          contactId: contactId,
          isSystemActivity: true,
          systemAction: 'DEACTIVATE'
        }
      })

      return {
        success: true,
        data: {
          contactId: contactId,
          pipedriveUpdated,
          localUpdated: true,
          activityId: activity.id
        }
      }

    } catch (error) {
      console.error('Error deactivating contact:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate contact'
      }
    }
  }

  async reactivateContact(
    contactId: string, 
    userId: string, 
    options: ReactivateOptions = {}
  ): Promise<ReactivateResult> {
    const { reason = 'Reactivated by user via My-500', syncToPipedrive = true } = options

    try {
      // 1. Validate contact exists and user has permission
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId: userId
        }
      })

      if (!contact) {
        return {
          success: false,
          error: 'Contact not found'
        }
      }

      // 2. Check if contact can be reactivated
      if (contact.isActive) {
        return {
          success: false,
          error: 'Contact is already active'
        }
      }

      // 3. Update Pipedrive if requested and contact has Pipedrive ID
      let pipedriveUpdated = false
      if (syncToPipedrive && contact.pipedrivePersonId) {
        const pipedriveService = await createPipedriveService(userId)
        
        if (!pipedriveService) {
          return {
            success: false,
            error: 'Failed to create Pipedrive service - check API key configuration'
          }
        }

        const pipedriveResult = await pipedriveService.reactivateContact(
          parseInt(contact.pipedrivePersonId)
        )
        
        if (!pipedriveResult.success) {
          return {
            success: false,
            error: `Failed to update Pipedrive: ${pipedriveResult.error}`
          }
        }
        
        pipedriveUpdated = true
      }

      // 4. Update local contact
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          isActive: true,
          deactivatedAt: null,
          deactivatedBy: null,
          deactivationReason: null
        }
      })

      // 5. Create system activity for audit
      const activity = await prisma.activity.create({
        data: {
          type: 'EMAIL', // Use a generic type for system activities
          subject: 'Contact Reactivated',
          note: `Contact ${contact.name} was reactivated. Reason: ${reason}`,
          userId: userId,
          contactId: contactId,
          isSystemActivity: true,
          systemAction: 'REACTIVATE'
        }
      })

      return {
        success: true,
        data: {
          contactId: contactId,
          pipedriveUpdated,
          localUpdated: true,
          activityId: activity.id
        }
      }

    } catch (error) {
      console.error('Error reactivating contact:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate contact'
      }
    }
  }
} 