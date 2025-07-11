// Mock the ActivityService
vi.mock('@/server/services/activityService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/activities/analytics/route'
import { ActivityService } from '@/server/services/activityService'
import { getServerSession } from '@/lib/auth'
import type { Contact, User } from '@prisma/client'

type ActivityAnalytics = {
  totalActivities: number
  activityBreakdown: Record<string, number>
  outcomeBreakdown: Record<string, number>
  averageActivitiesPerContact: number
  mostActiveContact: Contact | null
  recentActivityTrend: Array<{ date: string; count: number }>
}

const mockActivityService = vi.mocked(ActivityService)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/activities/analytics', () => {
  let mockActivityServiceInstance: any
  let mockUser: User
  let mockContact: Contact
  let mockAnalytics: ActivityAnalytics

  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'CONSULTANT',
      pipedriveApiKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: null,
      image: null,
    } as User

    mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      organisation: 'Acme Corp',
      warmnessScore: 5,
      lastContacted: new Date('2024-01-15'),
      addedToCampaign: true,
      pipedrivePersonId: 'pipedrive-person-123',
      pipedriveOrgId: 'pipedrive-org-456',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: mockUser.id,
    } as Contact

    mockAnalytics = {
      totalActivities: 15,
      activityBreakdown: {
        EMAIL: 5,
        CALL: 3,
        MEETING: 2,
        LINKEDIN: 2,
        REFERRAL: 2,
        CONFERENCE: 1,
      },
      outcomeBreakdown: {
        POSITIVE: 8,
        NEUTRAL: 4,
        NEGATIVE: 3,
      },
      averageActivitiesPerContact: 3.5,
      mostActiveContact: mockContact,
      recentActivityTrend: [
        { date: '2024-01-15', count: 3 },
        { date: '2024-01-14', count: 2 },
        { date: '2024-01-13', count: 1 },
      ],
    }

    mockActivityServiceInstance = {
      getActivityAnalytics: vi.fn(),
    }

    mockActivityService.mockImplementation(() => mockActivityServiceInstance)
    mockGetServerSession.mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/activities/analytics', () => {
    it('should return activity analytics', async () => {
      // Arrange
      mockActivityServiceInstance.getActivityAnalytics.mockResolvedValue(mockAnalytics)

      const request = new NextRequest('http://localhost:3000/api/activities/analytics')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.totalActivities).toBe(15)
      expect(data.activityBreakdown).toEqual({
        EMAIL: 5,
        CALL: 3,
        MEETING: 2,
        LINKEDIN: 2,
        REFERRAL: 2,
        CONFERENCE: 1,
      })
      expect(data.outcomeBreakdown).toEqual({
        POSITIVE: 8,
        NEUTRAL: 4,
        NEGATIVE: 3,
      })
      expect(data.averageActivitiesPerContact).toBe(3.5)
      expect(data.mostActiveContact).toBeDefined()
      expect(data.recentActivityTrend).toHaveLength(3)
      expect(mockActivityServiceInstance.getActivityAnalytics).toHaveBeenCalledWith({
        userId: mockUser.id,
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/activities/analytics')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockActivityServiceInstance.getActivityAnalytics).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockActivityServiceInstance.getActivityAnalytics.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/activities/analytics')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should handle empty analytics gracefully', async () => {
      // Arrange
      const emptyAnalytics = {
        totalActivities: 0,
        activityBreakdown: {
          EMAIL: 0,
          CALL: 0,
          MEETING: 0,
          LINKEDIN: 0,
          REFERRAL: 0,
          CONFERENCE: 0,
        },
        outcomeBreakdown: {
          POSITIVE: 0,
          NEUTRAL: 0,
          NEGATIVE: 0,
        },
        averageActivitiesPerContact: 0,
        mostActiveContact: null,
        recentActivityTrend: [],
      }

      mockActivityServiceInstance.getActivityAnalytics.mockResolvedValue(emptyAnalytics)

      const request = new NextRequest('http://localhost:3000/api/activities/analytics')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.totalActivities).toBe(0)
      expect(data.activityBreakdown).toEqual({
        EMAIL: 0,
        CALL: 0,
        MEETING: 0,
        LINKEDIN: 0,
        REFERRAL: 0,
        CONFERENCE: 0,
      })
      expect(data.outcomeBreakdown).toEqual({
        POSITIVE: 0,
        NEUTRAL: 0,
        NEGATIVE: 0,
      })
      expect(data.averageActivitiesPerContact).toBe(0)
      expect(data.mostActiveContact).toBeNull()
      expect(data.recentActivityTrend).toEqual([])
    })
  })
}) 