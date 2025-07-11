// Mock the ActivityService
vi.mock('@/server/services/activityService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/activities/route'
import { ActivityService } from '@/server/services/activityService'
import { getServerSession } from '@/lib/auth'
import type { Activity, ActivityType, Contact, User } from '@prisma/client'

const mockActivityService = vi.mocked(ActivityService)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/activities', () => {
  let mockActivityServiceInstance: any
  let mockUser: User
  let mockContact: Contact
  let mockActivity: Activity

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

    mockActivity = {
      id: 'activity-123',
      type: 'EMAIL' as ActivityType,
      subject: 'Follow-up Email',
      note: 'Contact responded positively',
      dueDate: new Date('2024-01-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
      contactId: mockContact.id,
      campaignId: null,
      userId: mockUser.id,
    } as Activity

    mockActivityServiceInstance = {
      getActivities: vi.fn(),
      createActivity: vi.fn(),
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

  describe('GET /api/activities', () => {
    it('should return activities with default pagination', async () => {
      // Arrange
      const mockResult = {
        activities: [mockActivity],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }

      mockActivityServiceInstance.getActivities.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/activities')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.activities).toHaveLength(1)
      expect(data.total).toBe(1)
      expect(data.page).toBe(1)
      expect(data.limit).toBe(10)
      expect(mockActivityServiceInstance.getActivities).toHaveBeenCalledWith({
        userId: mockUser.id,
        page: 1,
        limit: 10,
      })
    })

    it('should apply query parameters correctly', async () => {
      // Arrange
      const mockResult = {
        activities: [mockActivity],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      }

      mockActivityServiceInstance.getActivities.mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/activities?type=EMAIL&outcome=POSITIVE&contactId=contact-123&page=2&limit=5'
      )

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.activities).toHaveLength(1)
      expect(mockActivityServiceInstance.getActivities).toHaveBeenCalledWith({
        userId: mockUser.id,
        type: 'EMAIL',
        outcome: 'POSITIVE',
        contactId: 'contact-123',
        page: 2,
        limit: 5,
      })
    })

    it('should handle date range filters', async () => {
      // Arrange
      const mockResult = {
        activities: [mockActivity],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }

      mockActivityServiceInstance.getActivities.mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/activities?dateFrom=2024-01-01&dateTo=2024-01-31'
      )

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(mockActivityServiceInstance.getActivities).toHaveBeenCalledWith({
        userId: mockUser.id,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        page: 1,
        limit: 10,
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/activities')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockActivityServiceInstance.getActivities).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockActivityServiceInstance.getActivities.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/activities')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should handle invalid query parameters', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/activities?page=invalid&limit=invalid'
      )

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid query parameters' })
      expect(mockActivityServiceInstance.getActivities).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/activities', () => {
    it('should create activity successfully', async () => {
      // Arrange
      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: '2024-01-15',
        contactId: mockContact.id,
      }

      const createdActivity = { ...mockActivity, ...activityData }
      mockActivityServiceInstance.createActivity.mockResolvedValue(createdActivity)

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.type).toBe(activityData.type)
      expect(data.subject).toBe(activityData.subject)
      expect(data.contactId).toBe(activityData.contactId)
      expect(mockActivityServiceInstance.createActivity).toHaveBeenCalledWith({
        type: activityData.type,
        subject: activityData.subject,
        note: activityData.note,
        dueDate: new Date(activityData.dueDate),
        contactId: activityData.contactId,
        userId: mockUser.id,
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: '2024-01-15',
        contactId: mockContact.id,
      }

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockActivityServiceInstance.createActivity).not.toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        subject: 'Follow-up Email',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Validation failed' })
      expect(mockActivityServiceInstance.createActivity).not.toHaveBeenCalled()
    })

    it('should validate activity type', async () => {
      // Arrange
      const invalidData = {
        type: 'INVALID_TYPE',
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: '2024-01-15',
        contactId: mockContact.id,
      }

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Validation failed' })
      expect(mockActivityServiceInstance.createActivity).not.toHaveBeenCalled()
    })

    it('should validate activity outcome', async () => {
      // Arrange
      const invalidData = {
        type: 'EMAIL',
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: '2024-01-15',
        contactId: mockContact.id,
      }

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Validation failed' })
      expect(mockActivityServiceInstance.createActivity).not.toHaveBeenCalled()
    })

    it('should validate date format', async () => {
      // Arrange
      const invalidData = {
        type: 'EMAIL',
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: 'invalid-date',
        contactId: mockContact.id,
      }

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Validation failed' })
      expect(mockActivityServiceInstance.createActivity).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid JSON' })
      expect(mockActivityServiceInstance.createActivity).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: '2024-01-15',
        contactId: mockContact.id,
      }

      mockActivityServiceInstance.createActivity.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should handle contact not found error', async () => {
      // Arrange
      const activityData = {
        type: 'EMAIL',
        subject: 'Follow-up Email',
        description: 'Sent follow-up email about proposal',
        date: '2024-01-15',
        outcome: 'POSITIVE',
        contactId: 'non-existent-contact',
      }

      mockActivityServiceInstance.createActivity.mockRejectedValue(new Error('Contact not found'))

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Contact not found' })
    })
  })
}) 