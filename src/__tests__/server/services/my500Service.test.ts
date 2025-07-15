import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { My500Service } from '@/server/services/my500Service'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    syncHistory: {
      findFirst: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
  },
}))

describe('My500Service', () => {
  let service: My500Service

  beforeEach(() => {
    vi.clearAllMocks()
    service = new My500Service()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('searchContacts', () => {
    const mockContacts = [
      {
        id: 'contact-1',
        name: 'Alice',
        email: 'alice@example.com',
        organisation: 'OrgA',
        warmnessScore: 1,
        lastContacted: new Date('2024-01-01T10:00:00Z'),
        addedToCampaign: true,
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        userId: 'user-123',
        activities: []
      }
    ]

    it('should search contacts with basic criteria', async () => {
      prisma.contact.findMany.mockResolvedValue(mockContacts)
      prisma.contact.count.mockResolvedValue(1)

      const result = await service.searchContacts({
        userId: 'user-123',
        page: 1,
        limit: 10
      })

      expect(result.contacts).toEqual(mockContacts)
      expect(result.total).toBe(1)
      expect(prisma.contact.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: [
          { addedToCampaign: 'desc' },
          { warmnessScore: 'asc' },
          { lastContacted: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: 0,
        take: 10
      })
    })

    it('should apply search filter', async () => {
      prisma.contact.findMany.mockResolvedValue(mockContacts)
      prisma.contact.count.mockResolvedValue(1)

      await service.searchContacts({
        userId: 'user-123',
        search: 'alice',
        page: 1,
        limit: 10
      })

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-123',
            OR: [
              { name: { contains: 'alice', mode: 'insensitive' } },
              { email: { contains: 'alice', mode: 'insensitive' } },
              { organisation: { contains: 'alice', mode: 'insensitive' } }
            ]
          }
        })
      )
    })

    it('should apply campaign filter', async () => {
      prisma.contact.findMany.mockResolvedValue(mockContacts)
      prisma.contact.count.mockResolvedValue(1)

      await service.searchContacts({
        userId: 'user-123',
        filter: 'campaign',
        page: 1,
        limit: 10
      })

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-123',
            addedToCampaign: true
          }
        })
      )
    })

    it('should apply custom sorting', async () => {
      prisma.contact.findMany.mockResolvedValue(mockContacts)
      prisma.contact.count.mockResolvedValue(1)

      await service.searchContacts({
        userId: 'user-123',
        sort: 'name',
        order: 'desc',
        page: 1,
        limit: 10
      })

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'desc' }]
        })
      )
    })

    it('should handle pagination correctly', async () => {
      prisma.contact.findMany.mockResolvedValue(mockContacts)
      prisma.contact.count.mockResolvedValue(50)

      await service.searchContacts({
        userId: 'user-123',
        page: 3,
        limit: 10
      })

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10
        })
      )
    })
  })

  describe('getSyncStatus', () => {
    it('should return sync status with last sync timestamp', async () => {
      const mockUser = { lastSyncTimestamp: new Date('2024-01-01T10:00:00Z') }
      const mockSyncHistory = { startTime: new Date('2024-01-01T11:00:00Z') }

      prisma.user.findUnique.mockResolvedValue(mockUser)
      prisma.contact.count.mockResolvedValue(100)
      prisma.syncHistory.findFirst.mockResolvedValue(mockSyncHistory)

      const result = await service.getSyncStatus('user-123')

      expect(result).toEqual({
        lastSync: '2024-01-01T11:00:00.000Z',
        totalContacts: 100,
        syncedContacts: 100,
        pendingSync: false,
        syncInProgress: false
      })
    })

    it('should handle no sync history', async () => {
      prisma.user.findUnique.mockResolvedValue({ lastSyncTimestamp: null })
      prisma.contact.count.mockResolvedValue(0)
      prisma.syncHistory.findFirst.mockResolvedValue(null)

      const result = await service.getSyncStatus('user-123')

      expect(result.lastSync).toBeNull()
      expect(result.totalContacts).toBe(0)
    })
  })

  describe('getAvailableFilters', () => {
    it('should return available filters', async () => {
      const result = await service.getAvailableFilters('user-123')

      expect(result).toEqual({
        available: ['campaign', 'status'],
        applied: []
      })
    })
  })

  describe('getContactById', () => {
    it('should return contact with activities', async () => {
      const mockContact = {
        id: 'contact-1',
        name: 'Alice',
        activities: [{ id: 'activity-1', type: 'EMAIL' }]
      }

      prisma.contact.findFirst.mockResolvedValue(mockContact)

      const result = await service.getContactById('contact-1', 'user-123')

      expect(result).toEqual(mockContact)
      expect(prisma.contact.findFirst).toHaveBeenCalledWith({
        where: { id: 'contact-1', userId: 'user-123' },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    })

    it('should return null for non-existent contact', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)

      const result = await service.getContactById('non-existent', 'user-123')

      expect(result).toBeNull()
    })
  })

  describe('getRecentActivities', () => {
    it('should return recent activities with contact info', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          type: 'EMAIL',
          contact: { id: 'contact-1', name: 'Alice', email: 'alice@example.com' }
        }
      ]

      prisma.activity.findMany.mockResolvedValue(mockActivities)

      const result = await service.getRecentActivities('user-123', 5)

      expect(result).toEqual(mockActivities)
      expect(prisma.activity.findMany).toHaveBeenCalledWith({
        where: { contact: { userId: 'user-123' } },
        include: {
          contact: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    })
  })

  describe('getContactStats', () => {
    it('should return contact statistics', async () => {
      prisma.contact.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25)  // inCampaign
        .mockResolvedValueOnce(60)  // warm
        .mockResolvedValueOnce(40)  // cold

      const result = await service.getContactStats('user-123')

      expect(result).toEqual({
        total: 100,
        inCampaign: 25,
        warm: 60,
        cold: 40
      })

      expect(prisma.contact.count).toHaveBeenCalledTimes(4)
    })
  })
}) 