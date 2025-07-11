// Mock the ContactService
vi.mock('@/server/services/contactService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/contacts/[id]/analytics/route'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import type { ActivityType } from '@prisma/client'

type ContactAnalytics = {
  totalActivities: number
  activityBreakdown: Record<string, number>
  lastActivityDate: Date | null
  averageWarmnessScore: number
  campaignsCount: number
}

const mockContactService = vi.mocked(ContactService)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/contacts/[id]/analytics', () => {
  let mockContactServiceInstance: any
  let mockUser: any
  let mockAnalytics: ContactAnalytics

  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'CONSULTANT',
    }

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
      lastActivityDate: new Date('2024-01-15'),
      averageWarmnessScore: 7,
      campaignsCount: 3,
    }

    mockContactServiceInstance = {
      getContactAnalytics: vi.fn(),
    }

    mockContactService.mockImplementation(() => mockContactServiceInstance)
    mockGetServerSession.mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/contacts/[id]/analytics', () => {
    it('should return contact analytics', async () => {
      // Arrange
      mockContactServiceInstance.getContactAnalytics.mockResolvedValue(mockAnalytics)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/analytics')

      // Act
      const response = await GET(request, { params: { id: 'contact-123' } })
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
      expect(data.averageWarmnessScore).toBe(7)
      expect(data.campaignsCount).toBe(3)
      expect(mockContactServiceInstance.getContactAnalytics).toHaveBeenCalledWith('contact-123')
    })

    it('should return 404 when contact not found', async () => {
      // Arrange
      mockContactServiceInstance.getContactAnalytics.mockRejectedValue(new Error('Contact not found'))

      const request = new NextRequest('http://localhost:3000/api/contacts/non-existent/analytics')

      // Act
      const response = await GET(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Contact not found' })
      expect(mockContactServiceInstance.getContactAnalytics).toHaveBeenCalledWith('non-existent')
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/analytics')

      // Act
      const response = await GET(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockContactServiceInstance.getContactAnalytics).not.toHaveBeenCalled()
    })

    it('should handle contact with no activities', async () => {
      // Arrange
      const emptyAnalytics: ContactAnalytics = {
        totalActivities: 0,
        activityBreakdown: {
          EMAIL: 0,
          CALL: 0,
          MEETING: 0,
          LINKEDIN: 0,
          REFERRAL: 0,
          CONFERENCE: 0,
        },
        lastActivityDate: null,
        averageWarmnessScore: 5,
        campaignsCount: 0,
      }

      mockContactServiceInstance.getContactAnalytics.mockResolvedValue(emptyAnalytics)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/analytics')

      // Act
      const response = await GET(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.totalActivities).toBe(0)
      expect(data.lastActivityDate).toBeNull()
      expect(data.campaignsCount).toBe(0)
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockContactServiceInstance.getContactAnalytics.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/analytics')

      // Act
      const response = await GET(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })
}) 