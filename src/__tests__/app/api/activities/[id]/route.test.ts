// Mock the ActivityService
vi.mock('@/server/services/activityService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/activities/[id]/route'
import { ActivityService } from '@/server/services/activityService'
import { getServerSession } from '@/lib/auth'
import type { Activity, ActivityType, Contact, User } from '@prisma/client'

const mockActivityService = vi.mocked(ActivityService)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/activities/[id]', () => {
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
      getActivityById: vi.fn(),
      updateActivity: vi.fn(),
      deleteActivity: vi.fn(),
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

  describe('GET /api/activities/[id]', () => {
    it('should return activity by ID', async () => {
      // Arrange
      mockActivityServiceInstance.getActivityById.mockResolvedValue(mockActivity)

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123')

      // Act
      const response = await GET(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe('activity-123')
      expect(data.type).toBe('EMAIL')
      expect(data.subject).toBe('Follow-up Email')
      expect(mockActivityServiceInstance.getActivityById).toHaveBeenCalledWith('activity-123')
    })

    it('should return 404 when activity not found', async () => {
      // Arrange
      mockActivityServiceInstance.getActivityById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/activities/non-existent')

      // Act
      const response = await GET(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Activity not found' })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123')

      // Act
      const response = await GET(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockActivityServiceInstance.getActivityById).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockActivityServiceInstance.getActivityById.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123')

      // Act
      const response = await GET(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })

  describe('PUT /api/activities/[id]', () => {
    it('should update activity successfully', async () => {
      // Arrange
      const updateData = {
        subject: 'Updated Subject',
        note: 'Updated notes',
        dueDate: new Date('2024-01-20'),
      }

      const updatedActivity = { ...mockActivity, ...updateData }
      mockActivityServiceInstance.updateActivity.mockResolvedValue(updatedActivity)

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.subject).toBe('Updated Subject')
      expect(data.note).toBe('Updated notes')
      expect(mockActivityServiceInstance.updateActivity).toHaveBeenCalledWith('activity-123', updateData)
    })

    it('should return 404 when activity not found', async () => {
      // Arrange
      const updateData = { subject: 'Updated Subject' }
      mockActivityServiceInstance.updateActivity.mockRejectedValue(new Error('Activity not found'))

      const request = new NextRequest('http://localhost:3000/api/activities/non-existent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Activity not found' })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const updateData = { subject: 'Updated Subject' }
      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockActivityServiceInstance.updateActivity).not.toHaveBeenCalled()
    })

    it('should validate request data', async () => {
      // Arrange
      const invalidData = {
        type: 'INVALID_TYPE',
        outcome: 'INVALID_OUTCOME',
      }

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Validation failed' })
      expect(mockActivityServiceInstance.updateActivity).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // Act
      const response = await PUT(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid JSON' })
      expect(mockActivityServiceInstance.updateActivity).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const updateData = { subject: 'Updated Subject' }
      mockActivityServiceInstance.updateActivity.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })

  describe('DELETE /api/activities/[id]', () => {
    it('should delete activity successfully', async () => {
      // Arrange
      mockActivityServiceInstance.deleteActivity.mockResolvedValue(mockActivity)

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe('activity-123')
      expect(mockActivityServiceInstance.deleteActivity).toHaveBeenCalledWith('activity-123')
    })

    it('should return 404 when activity not found', async () => {
      // Arrange
      mockActivityServiceInstance.deleteActivity.mockRejectedValue(new Error('Activity not found'))

      const request = new NextRequest('http://localhost:3000/api/activities/non-existent', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Activity not found' })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockActivityServiceInstance.deleteActivity).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockActivityServiceInstance.deleteActivity.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/activities/activity-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'activity-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })
}) 