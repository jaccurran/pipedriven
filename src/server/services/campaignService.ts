import { prisma } from '@/lib/prisma'
import type { Campaign, Contact, Activity, ActivityType } from '@prisma/client'

export interface CreateCampaignData {
  name: string
  description?: string
  sector?: string
  theme?: string
  status?: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  startDate?: Date
  endDate?: Date
  targetLeads?: number
  budget?: number
}

export interface UpdateCampaignData {
  name?: string
  description?: string
  sector?: string
  theme?: string
  startDate?: Date
  endDate?: Date
}

export interface GetCampaignsOptions {
  page?: number
  limit?: number
  sector?: string
  startDate?: Date
  endDate?: Date
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface GetCampaignsResult {
  campaigns: Campaign[]
  pagination: PaginationInfo
}

export interface CampaignAnalytics {
  totalContacts: number
  totalActivities: number
  activityBreakdown: Record<ActivityType, number>
  meetingsRequested: number
  meetingsBooked: number
}

export interface CampaignPerformance {
  totalContacts: number
  activeContacts: number
  averageWarmnessScore: number
  totalActivities: number
  conversionRate: number
}

export class CampaignService {
  async createCampaign(data: CreateCampaignData): Promise<Campaign> {
    return await prisma.campaign.create({
      data,
    })
  }

  async getCampaigns(options: GetCampaignsOptions = {}): Promise<GetCampaignsResult> {
    const { page = 1, limit = 10, sector, startDate, endDate } = options
    const skip = (page - 1) * limit

    const where: any = {}
    if (sector) {
      where.sector = sector
    }
    if (startDate || endDate) {
      where.startDate = {}
      where.endDate = {}
      if (startDate) {
        where.startDate.gte = startDate
      }
      if (endDate) {
        where.endDate.lte = endDate
      }
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ])

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getCampaignById(id: string): Promise<Campaign & {
    users: any[]
    contacts: Contact[]
    activities: Activity[]
  } | null> {
    return await prisma.campaign.findUnique({
      where: { id },
      include: {
        users: true,
        contacts: true,
        activities: true,
      },
    })
  }

  async updateCampaign(id: string, data: UpdateCampaignData): Promise<Campaign> {
    return await prisma.campaign.update({
      where: { id },
      data,
    })
  }

  async deleteCampaign(id: string): Promise<Campaign> {
    return await prisma.campaign.delete({
      where: { id },
    })
  }

  async assignContactsToCampaign(campaignId: string, contactIds: string[]): Promise<Campaign & { contacts: Contact[] }> {
    // Verify all contacts exist
    const foundContacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
    })

    if (foundContacts.length !== contactIds.length) {
      throw new Error('Some contacts not found')
    }

    return await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        contacts: {
          connect: contactIds.map(id => ({ id })),
        },
      },
      include: {
        contacts: true,
      },
    })
  }

  async removeContactsFromCampaign(campaignId: string, contactIds: string[]): Promise<Campaign & { contacts: Contact[] }> {
    return await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        contacts: {
          disconnect: contactIds.map(id => ({ id })),
        },
      },
      include: {
        contacts: true,
      },
    })
  }

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const [activities, totalContacts, totalActivities] = await Promise.all([
      prisma.activity.findMany({
        where: { campaignId },
      }),
      prisma.contact.count({
        where: { campaigns: { some: { id: campaignId } } },
      }),
      prisma.activity.count({
        where: { campaignId },
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

    let meetingsRequested = 0
    let meetingsBooked = 0

    activities.forEach(activity => {
      activityBreakdown[activity.type]++
      if (activity.type === 'MEETING') {
        meetingsRequested++
        meetingsBooked++
      }
    })

    return {
      totalContacts,
      totalActivities,
      activityBreakdown,
      meetingsRequested,
      meetingsBooked,
    }
  }

  async getCampaignPerformance(campaignId: string): Promise<CampaignPerformance> {
    const [contacts, totalActivities] = await Promise.all([
      prisma.contact.findMany({
        where: { campaigns: { some: { id: campaignId } } },
      }),
      prisma.activity.count({
        where: { campaignId },
      }),
    ])

    const totalContacts = contacts.length
    const activeContacts = contacts.filter(contact => contact.addedToCampaign).length
    const averageWarmnessScore = totalContacts > 0 
      ? Number((contacts.reduce((sum, contact) => sum + contact.warmnessScore, 0) / totalContacts).toFixed(2))
      : 0
    const conversionRate = totalContacts > 0 
      ? Number(((activeContacts / totalContacts) * 100).toFixed(2))
      : 0

    return {
      totalContacts,
      activeContacts,
      averageWarmnessScore,
      totalActivities,
      conversionRate,
    }
  }
} 