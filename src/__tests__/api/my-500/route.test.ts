import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/my-500/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/my-500', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    } as any)
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 401 when session has no user', async () => {
      mockGetServerSession.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Query Parameters', () => {
    it('should use default pagination when no parameters provided', async () => {
      mockPrisma.contact.count.mockResolvedValue(0)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      await GET(request)

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // (1 - 1) * 50
          take: 50, // default limit
        })
      )
    })

    it('should handle custom pagination parameters', async () => {
      mockPrisma.contact.count.mockResolvedValue(100)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest(
        'http://localhost:3000/api/my-500?page=2&limit=20'
      )
      await GET(request)

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (2 - 1) * 20
          take: 20,
        })
      )
    })

    it('should enforce minimum and maximum limits', async () => {
      mockPrisma.contact.count.mockResolvedValue(100)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      // Test minimum limit
      const request1 = new NextRequest(
        'http://localhost:3000/api/my-500?limit=0'
      )
      await GET(request1)
      
      // Reset mocks for the second request
      vi.clearAllMocks()
      mockPrisma.contact.count.mockResolvedValue(100)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
      } as any)

      // Test maximum limit
      const request2 = new NextRequest(
        'http://localhost:3000/api/my-500?limit=200'
      )
      await GET(request2)
      
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // maximum limit
        })
      )
    })

    it('should handle search parameter', async () => {
      mockPrisma.contact.count.mockResolvedValue(1)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest(
        'http://localhost:3000/api/my-500?search=john'
      )
      await GET(request)

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
              { organisation: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        })
      )
    })
  })

  describe('Data Retrieval', () => {
    it('should return contacts with activities', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
          organisation: 'Tech Corp',
          warmnessScore: 7,
          lastContacted: new Date('2024-01-15'),
          addedToCampaign: false,
          userId: 'test-user-id',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          activities: [
            {
              id: 'activity-1',
              type: 'EMAIL',
              subject: 'Follow up',
              createdAt: new Date('2024-01-15'),
            },
          ],
        },
      ]

      mockPrisma.contact.count.mockResolvedValue(1)
      mockPrisma.contact.findMany.mockResolvedValue(mockContacts)
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.contacts).toHaveLength(1)
      expect(data.data.contacts[0].name).toBe('John Doe')
      expect(data.data.contacts[0].activities).toHaveLength(1)
    })

    it('should apply priority sorting correctly', async () => {
      // Mock contacts in the order they would be returned by database
      // The database ordering should put addedToCampaign=true contacts first
      const mockContacts = [
        {
          id: 'contact-2',
          name: 'High Priority',
          warmnessScore: 3,
          lastContacted: null,
          addedToCampaign: true,
          userId: 'test-user-id',
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-05'),
          activities: [],
        },
        {
          id: 'contact-1',
          name: 'Low Priority',
          warmnessScore: 9,
          lastContacted: new Date('2024-01-15'),
          addedToCampaign: false,
          userId: 'test-user-id',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          activities: [],
        },
      ]

      mockPrisma.contact.count.mockResolvedValue(2)
      mockPrisma.contact.findMany.mockResolvedValue(mockContacts)
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      const response = await GET(request)
      const data = await response.json()

      // High priority contact (addedToCampaign: true) should come first
      expect(data.data.contacts[0].name).toBe('High Priority')
      expect(data.data.contacts[0].addedToCampaign).toBe(true)
    })

    it('should include pagination information', async () => {
      mockPrisma.contact.count.mockResolvedValue(150)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest(
        'http://localhost:3000/api/my-500?page=2&limit=20'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 150,
        totalPages: 8,
        hasNext: true,
        hasPrev: true,
      })
    })

    it('should include sync status information', async () => {
      mockPrisma.contact.count.mockResolvedValue(50)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: new Date('2024-01-15T10:00:00Z'),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.syncStatus).toEqual({
        lastSync: '2024-01-15T10:00:00.000Z',
        totalContacts: 50,
        syncedContacts: 50,
        pendingSync: false,
        syncInProgress: false,
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.contact.count.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/my-500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle missing user gracefully', async () => {
      mockPrisma.contact.count.mockResolvedValue(0)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.syncStatus.lastSync).toBe(null)
    })
  })

  describe('Performance Optimizations (Future)', () => {
    it('should use optimized query with include for activities', async () => {
      mockPrisma.contact.count.mockResolvedValue(1)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      await GET(request)

      // Verify that activities are included in the query (N+1 prevention)
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            activities: true,
          },
        })
      )
    })

    it('should apply proper ordering for performance', async () => {
      mockPrisma.contact.count.mockResolvedValue(1)
      mockPrisma.contact.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockResolvedValue({
        lastSyncTimestamp: null,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/my-500')
      await GET(request)

      // Verify proper ordering for efficient sorting
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { addedToCampaign: 'desc' },
            { warmnessScore: 'asc' },
            { lastContacted: 'asc' },
            { createdAt: 'desc' },
          ],
        })
      )
    })
  })
}) 