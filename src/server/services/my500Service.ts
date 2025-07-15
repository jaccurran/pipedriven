import { prisma } from '@/lib/prisma'
import { 
  ContactSearchCriteria, 
  ContactSearchResult, 
  My500Contact, 
  My500SyncStatus,
  My500Filters 
} from '@/types/my500'
import { 
  buildWhereClause, 
  buildOrderByClause, 
  calculatePagination, 
  getAppliedFilters 
} from '@/lib/validation/my500'

export class My500Service {
  /**
   * Search and retrieve contacts for a user with pagination and filtering
   */
  async searchContacts(criteria: ContactSearchCriteria): Promise<ContactSearchResult> {
    const { userId, search, filter, page, limit, sort, order } = criteria

    const where = buildWhereClause(userId, search, filter)
    const orderBy = buildOrderByClause(sort, order)

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.contact.count({ where })
    ])

    return {
      contacts: contacts as My500Contact[],
      total
    }
  }

  /**
   * Get sync status for a user
   */
  async getSyncStatus(userId: string): Promise<My500SyncStatus> {
    const [user, totalContacts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { lastSyncTimestamp: true }
      }),
      prisma.contact.count({ where: { userId } })
    ])

    // Get the most recent successful sync
    const lastSync = await prisma.syncHistory.findFirst({
      where: { 
        userId, 
        status: 'SUCCESS' 
      },
      orderBy: { startTime: 'desc' },
      select: { startTime: true }
    })

    return {
      lastSync: lastSync?.startTime?.toISOString() || null,
      totalContacts,
      syncedContacts: totalContacts, // This will be enhanced when we implement sync logic
      pendingSync: false, // This will be enhanced when we implement sync logic
      syncInProgress: false // This will be enhanced when we implement sync logic
    }
  }

  /**
   * Get available filters for a user
   */
  async getAvailableFilters(userId: string): Promise<My500Filters> {
    // For now, return static filters
    // This could be enhanced to return dynamic filters based on user's data
    return {
      available: ['campaign', 'status'],
      applied: []
    }
  }

  /**
   * Get contact by ID with activities
   */
  async getContactById(contactId: string, userId: string): Promise<My500Contact | null> {
    const contact = await prisma.contact.findFirst({
      where: { 
        id: contactId, 
        userId 
      },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return contact as My500Contact | null
  }

  /**
   * Get recent activities for a user's contacts
   */
  async getRecentActivities(userId: string, limit: number = 10) {
    return prisma.activity.findMany({
      where: {
        contact: {
          userId
        }
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Get contact statistics for a user
   */
  async getContactStats(userId: string) {
    const [
      totalContacts,
      campaignContacts,
      warmContacts,
      coldContacts
    ] = await Promise.all([
      prisma.contact.count({ where: { userId } }),
      prisma.contact.count({ where: { userId, addedToCampaign: true } }),
      prisma.contact.count({ where: { userId, warmnessScore: { lte: 3 } } }),
      prisma.contact.count({ where: { userId, warmnessScore: { gt: 3 } } })
    ])

    return {
      total: totalContacts,
      inCampaign: campaignContacts,
      warm: warmContacts,
      cold: coldContacts
    }
  }
}

// Export singleton instance
export const my500Service = new My500Service() 