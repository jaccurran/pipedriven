// Mock the ContactService
vi.mock('@/server/services/contactService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/contacts/[id]/assign-campaigns/route'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import type { Contact, Campaign } from '@prisma/client'

const mockContactService = vi.mocked(ContactService)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/contacts/[id]/assign-campaigns', () => {
  let mockContactServiceInstance: any
  let mockUser: any
  let mockContact: Contact
  let mockContactWithCampaigns: Contact & { campaigns: Campaign[] }

  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'CONSULTANT',
    }

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

    mockContactWithCampaigns = {
      ...mockContact,
      campaigns: [
        { id: 'campaign-1', name: 'Campaign 1' } as Campaign,
        { id: 'campaign-2', name: 'Campaign 2' } as Campaign,
      ],
    }

    mockContactServiceInstance = {
      assignContactToCampaigns: vi.fn(),
      removeContactFromCampaigns: vi.fn(),
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

  describe('POST /api/contacts/[id]/assign-campaigns', () => {
    it('should assign contact to campaigns successfully', async () => {
      // Arrange
      const assignmentData = {
        action: 'assign',
        campaignIds: ['campaign-1', 'campaign-2'],
      }

      mockContactServiceInstance.assignContactToCampaigns.mockResolvedValue(mockContactWithCampaigns)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.campaigns).toHaveLength(2)
      expect(data.campaigns[0].id).toBe('campaign-1')
      expect(data.campaigns[1].id).toBe('campaign-2')
      expect(mockContactServiceInstance.assignContactToCampaigns).toHaveBeenCalledWith('contact-123', ['campaign-1', 'campaign-2'])
    })

    it('should remove contact from campaigns successfully', async () => {
      // Arrange
      const assignmentData = {
        action: 'remove',
        campaignIds: ['campaign-1'],
      }

      const contactWithRemainingCampaigns = {
        ...mockContact,
        campaigns: [{ id: 'campaign-2', name: 'Campaign 2' } as Campaign],
      }

      mockContactServiceInstance.removeContactFromCampaigns.mockResolvedValue(contactWithRemainingCampaigns)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.campaigns).toHaveLength(1)
      expect(data.campaigns[0].id).toBe('campaign-2')
      expect(mockContactServiceInstance.removeContactFromCampaigns).toHaveBeenCalledWith('contact-123', ['campaign-1'])
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const assignmentData = {
        action: 'assign',
        campaignIds: ['campaign-1'],
      }

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockContactServiceInstance.assignContactToCampaigns).not.toHaveBeenCalled()
      expect(mockContactServiceInstance.removeContactFromCampaigns).not.toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        action: 'invalid-action',
      }

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid action. Must be "assign" or "remove"' })
      expect(mockContactServiceInstance.assignContactToCampaigns).not.toHaveBeenCalled()
      expect(mockContactServiceInstance.removeContactFromCampaigns).not.toHaveBeenCalled()
    })

    it('should validate campaign IDs array', async () => {
      // Arrange
      const invalidData = {
        action: 'assign',
        campaignIds: 'not-an-array',
      }

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Campaign IDs must be an array' })
      expect(mockContactServiceInstance.assignContactToCampaigns).not.toHaveBeenCalled()
      expect(mockContactServiceInstance.removeContactFromCampaigns).not.toHaveBeenCalled()
    })

    it('should validate empty campaign IDs array', async () => {
      // Arrange
      const invalidData = {
        action: 'assign',
        campaignIds: [],
      }

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Campaign IDs array cannot be empty' })
      expect(mockContactServiceInstance.assignContactToCampaigns).not.toHaveBeenCalled()
      expect(mockContactServiceInstance.removeContactFromCampaigns).not.toHaveBeenCalled()
    })

    it('should return 404 when contact not found', async () => {
      // Arrange
      const assignmentData = {
        action: 'assign',
        campaignIds: ['campaign-1'],
      }

      mockContactServiceInstance.assignContactToCampaigns.mockRejectedValue(new Error('Contact not found'))

      const request = new NextRequest('http://localhost:3000/api/contacts/non-existent/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      // Act
      const response = await POST(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Contact not found' })
    })

    it('should handle invalid JSON body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid JSON' })
      expect(mockContactServiceInstance.assignContactToCampaigns).not.toHaveBeenCalled()
      expect(mockContactServiceInstance.removeContactFromCampaigns).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const assignmentData = {
        action: 'assign',
        campaignIds: ['campaign-1'],
      }

      mockContactServiceInstance.assignContactToCampaigns.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/assign-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      // Act
      const response = await POST(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })
}) 