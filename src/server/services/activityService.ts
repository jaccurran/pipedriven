import { prisma } from '@/lib/prisma'
import type { Activity, ActivityType, Contact, User } from '@prisma/client'

export interface CreateActivityData {
  type: ActivityType
  subject?: string
  note?: string
  dueDate?: Date
  contactId?: string
  campaignId?: string
  userId: string
}

export interface UpdateActivityData {
  type?: ActivityType
  subject?: string
  note?: string
  dueDate?: Date
  contactId?: string
  campaignId?: string
}

export interface ActivityFilters {
  userId: string
  type?: ActivityType
  contactId?: string
  campaignId?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

export interface ActivityListResult {
  activities: Activity[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ActivityAnalytics {
  totalActivities: number
  activityBreakdown: Record<ActivityType, number>
  averageActivitiesPerContact: number
  mostActiveContact: Contact | null
  recentActivityTrend: Array<{ date: string; count: number }>
}

export class ActivityService {
  async createActivity(data: CreateActivityData): Promise<Activity> {
    // Validate contact exists if provided
    if (data.contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: data.contactId },
      })
      if (!contact) {
        throw new Error('Contact not found')
      }
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    })
    if (!user) {
      throw new Error('User not found')
    }

    // Create activity and update contact's lastContacted in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the activity
      const activity = await tx.activity.create({
        data,
        include: {
          contact: true,
          user: true,
          campaign: true,
        },
      })

      // Update the contact's lastContacted field if this activity is for a contact
      if (data.contactId) {
        await tx.contact.update({
          where: { id: data.contactId },
          data: { lastContacted: new Date() },
        })
      }

      return activity
    })

    return result
  }

  async getActivities(filters: ActivityFilters): Promise<ActivityListResult> {
    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { userId: filters.userId }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.contactId) {
      where.contactId = filters.contactId
    }

    if (filters.campaignId) {
      where.campaignId = filters.campaignId
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo
      }
    }

    // Get activities
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          contact: true,
          user: true,
          campaign: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ])

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getActivityById(id: string): Promise<Activity | null> {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        contact: true,
        user: true,
        campaign: true,
      },
    })

    return activity
  }

  async updateActivity(id: string, data: UpdateActivityData): Promise<Activity> {
    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id },
    })
    if (!existingActivity) {
      throw new Error('Activity not found')
    }

    // Update activity
    const activity = await prisma.activity.update({
      where: { id },
      data,
      include: {
        contact: true,
        user: true,
        campaign: true,
      },
    })

    return activity
  }

  async deleteActivity(id: string): Promise<Activity> {
    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id },
    })
    if (!existingActivity) {
      throw new Error('Activity not found')
    }

    // Delete activity
    const activity = await prisma.activity.delete({
      where: { id },
    })

    return activity
  }

  async getActivityAnalytics(filters: { userId: string }): Promise<ActivityAnalytics> {
    // Get total activities
    const totalActivities = await prisma.activity.count({
      where: { userId: filters.userId },
    })

    // Get activity breakdown by type
    const activityBreakdownResult = await prisma.activity.groupBy({
      by: ['type'],
      where: { userId: filters.userId },
      _count: { type: true },
    })

    const activityBreakdown: Record<ActivityType, number> = {
      CALL: 0,
      EMAIL: 0,
      MEETING: 0,
      LINKEDIN: 0,
      REFERRAL: 0,
      CONFERENCE: 0,
    }

    activityBreakdownResult.forEach(item => {
      activityBreakdown[item.type] = item._count.type
    })

    // Get average activities per contact
    const contactActivityCounts = await prisma.activity.groupBy({
      by: ['contactId'],
      where: { 
        userId: filters.userId,
        contactId: { not: null }
      },
      _count: { contactId: true },
    })

    const totalContacts = contactActivityCounts.length
    const averageActivitiesPerContact = totalContacts > 0 
      ? contactActivityCounts.reduce((sum, item) => sum + item._count.contactId, 0) / totalContacts
      : 0

    // Get most active contact
    const mostActiveContactId = contactActivityCounts.length > 0
      ? contactActivityCounts.reduce((max, item) => 
          item._count.contactId > max._count.contactId ? item : max
        ).contactId
      : null

    const mostActiveContact = mostActiveContactId 
      ? await prisma.contact.findUnique({
          where: { id: mostActiveContactId },
        })
      : null

    // Get recent activity trend (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentActivityTrendResult = await prisma.activity.groupBy({
      by: ['createdAt'],
      where: { 
        userId: filters.userId,
        createdAt: { gte: sevenDaysAgo }
      },
      _count: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const recentActivityTrend = recentActivityTrendResult.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      count: item._count.createdAt,
    }))

    return {
      totalActivities,
      activityBreakdown,
      averageActivitiesPerContact,
      mostActiveContact,
      recentActivityTrend,
    }
  }
} 