import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/campaigns/[id]/assign-contacts/route'
import { CampaignService } from '@/server/services/campaignService'
import type { Campaign, Contact } from '@prisma/client'

// Mock the CampaignService
vi.mock('@/server/services/campaignService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

const mockCampaignService = vi.mocked(CampaignService)

describe('/api/campaigns/[id]/assign-contacts', () => {
  let mockRequest: NextRequest
  let mockCampaignServiceInstance: any
  let mockCampaign: Campaign
  let mockContact: Contact

  beforeEach(() => {
    mockCampaignServiceInstance = {
      assignContactsToCampaign: vi.fn(),
      removeContactsFromCampaign: vi.fn(),
    }

    // Mock the constructor to return our mock instance
    mockCampaignService.mockImplementation(() => mockCampaignServiceInstance)

    mockCampaign = {
      id: 'campaign-123',
      name: 'Q1 Lead Generation',
      description: 'Target high-value prospects for Q1',
      sector: 'Technology',
      theme: 'Digital Transformation',
      status: 'ACTIVE',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-03-31T00:00:00.000Z'),
      targetLeads: 100,
      budget: 5000.0,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      organisation: 'Tech Corp',
      warmnessScore: 5,
      lastContacted: null,
      addedToCampaign: false,
      pipedrivePersonId: null,
      pipedriveOrgId: null,
      userId: 'user-123',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/campaigns/[id]/assign-contacts', () => {
    it('should assign contacts to campaign successfully', async () => {
      // Arrange
      const contactIds = ['contact-1', 'contact-2']
      const contacts = [
        { ...mockContact, id: 'contact-1' },
        { ...mockContact, id: 'contact-2' },
      ]

      const campaignWithContacts = {
        ...mockCampaign,
        contacts,
      }

      mockCampaignServiceInstance.assignContactsToCampaign.mockResolvedValue(campaignWithContacts)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(campaignWithContacts)
      expect(mockCampaignServiceInstance.assignContactsToCampaign).toHaveBeenCalledWith('campaign-123', contactIds)
    })

    it('should validate required contactIds field', async () => {
      // Arrange
      const invalidData = {
        // Missing contactIds
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('contactIds is required')
    })

    it('should validate contactIds is an array', async () => {
      // Arrange
      const invalidData = {
        contactIds: 'not-an-array',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('contactIds must be an array')
    })

    it('should validate contactIds array is not empty', async () => {
      // Arrange
      const invalidData = {
        contactIds: [],
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('contactIds array cannot be empty')
    })

    it('should validate contactIds are strings', async () => {
      // Arrange
      const invalidData = {
        contactIds: [123, 'contact-2'],
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('All contactIds must be strings')
    })

    it('should handle service errors when contacts not found', async () => {
      // Arrange
      const contactIds = ['contact-1', 'contact-2']
      mockCampaignServiceInstance.assignContactsToCampaign.mockRejectedValue(new Error('Some contacts not found'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Some contacts not found')
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const contactIds = ['contact-1']
      mockCampaignServiceInstance.assignContactsToCampaign.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to assign contacts to campaign')
    })

    it('should handle invalid JSON', async () => {
      // Arrange
      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      })

      // Act
      const response = await POST(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid JSON')
    })
  })

  describe('DELETE /api/campaigns/[id]/assign-contacts', () => {
    it('should remove contacts from campaign successfully', async () => {
      // Arrange
      const contactIds = ['contact-1', 'contact-2']
      const remainingContacts = [{ ...mockContact, id: 'contact-3' }]

      const campaignWithRemainingContacts = {
        ...mockCampaign,
        contacts: remainingContacts,
      }

      mockCampaignServiceInstance.removeContactsFromCampaign.mockResolvedValue(campaignWithRemainingContacts)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(campaignWithRemainingContacts)
      expect(mockCampaignServiceInstance.removeContactsFromCampaign).toHaveBeenCalledWith('campaign-123', contactIds)
    })

    it('should validate required contactIds field', async () => {
      // Arrange
      const invalidData = {
        // Missing contactIds
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('contactIds is required')
    })

    it('should validate contactIds is an array', async () => {
      // Arrange
      const invalidData = {
        contactIds: 'not-an-array',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('contactIds must be an array')
    })

    it('should validate contactIds array is not empty', async () => {
      // Arrange
      const invalidData = {
        contactIds: [],
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('contactIds array cannot be empty')
    })

    it('should validate contactIds are strings', async () => {
      // Arrange
      const invalidData = {
        contactIds: [123, 'contact-2'],
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('All contactIds must be strings')
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const contactIds = ['contact-1']
      mockCampaignServiceInstance.removeContactsFromCampaign.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to remove contacts from campaign')
    })

    it('should handle invalid JSON', async () => {
      // Arrange
      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/assign-contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid JSON')
    })
  })
}) 