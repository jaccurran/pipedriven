import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/campaigns/[id]/route'
import { CampaignService } from '@/server/services/campaignService'
import type { Campaign, Contact } from '@prisma/client'

// Mock the CampaignService
vi.mock('@/server/services/campaignService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

const mockCampaignService = vi.mocked(CampaignService)

describe('/api/campaigns/[id]', () => {
  let mockRequest: NextRequest
  let mockCampaignServiceInstance: any
  let mockCampaign: Campaign
  let mockContact: Contact

  beforeEach(() => {
    mockCampaignServiceInstance = {
      getCampaignById: vi.fn(),
      updateCampaign: vi.fn(),
      deleteCampaign: vi.fn(),
      assignContactsToCampaign: vi.fn(),
      removeContactsFromCampaign: vi.fn(),
      getCampaignAnalytics: vi.fn(),
      getCampaignPerformance: vi.fn(),
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

  describe('GET /api/campaigns/[id]', () => {
    it('should return campaign by ID with related data', async () => {
      // Arrange
      const campaignWithRelations = {
        ...mockCampaign,
        users: [],
        contacts: [mockContact],
        activities: [],
      }

      mockCampaignServiceInstance.getCampaignById.mockResolvedValue(campaignWithRelations)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123')

      // Act
      const response = await GET(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Convert Date objects to strings for comparison since API serializes dates
      const expectedData = {
        ...campaignWithRelations,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-03-31T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        contacts: [{
          ...mockContact,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }],
      }
      
      expect(data).toEqual(expectedData)
      expect(mockCampaignServiceInstance.getCampaignById).toHaveBeenCalledWith('campaign-123')
    })

    it('should return 404 when campaign not found', async () => {
      // Arrange
      mockCampaignServiceInstance.getCampaignById.mockResolvedValue(null)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/non-existent')

      // Act
      const response = await GET(mockRequest, { params: { id: 'non-existent' } })

      // Assert
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Campaign not found')
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockCampaignServiceInstance.getCampaignById.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123')

      // Act
      const response = await GET(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch campaign')
    })
  })

  describe('PUT /api/campaigns/[id]', () => {
    it('should update campaign successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Campaign Name',
        description: 'Updated description',
      }

      const updatedCampaign = { ...mockCampaign, ...updateData }
      mockCampaignServiceInstance.updateCampaign.mockResolvedValue(updatedCampaign)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Convert Date objects to strings for comparison since API serializes dates
      const expectedData = {
        ...updatedCampaign,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-03-31T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }
      
      expect(data).toEqual(expectedData)
      expect(mockCampaignServiceInstance.updateCampaign).toHaveBeenCalledWith('campaign-123', updateData)
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        name: '', // Empty name
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await PUT(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Name cannot be empty')
    })

    it('should validate date formats', async () => {
      // Arrange
      const invalidData = {
        name: 'Valid Name',
        startDate: 'invalid-date',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await PUT(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid date format')
    })

    it('should return 404 when campaign not found', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' }
      mockCampaignServiceInstance.updateCampaign.mockRejectedValue(new Error('Campaign not found'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/non-existent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(mockRequest, { params: { id: 'non-existent' } })

      // Assert
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Campaign not found')
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' }
      mockCampaignServiceInstance.updateCampaign.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update campaign')
    })
  })

  describe('DELETE /api/campaigns/[id]', () => {
    it('should delete campaign successfully', async () => {
      // Arrange
      mockCampaignServiceInstance.deleteCampaign.mockResolvedValue(mockCampaign)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ message: 'Campaign deleted successfully' })
      expect(mockCampaignServiceInstance.deleteCampaign).toHaveBeenCalledWith('campaign-123')
    })

    it('should return 404 when campaign not found', async () => {
      // Arrange
      mockCampaignServiceInstance.deleteCampaign.mockRejectedValue(new Error('Campaign not found'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/non-existent', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'non-existent' } })

      // Assert
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Campaign not found')
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockCampaignServiceInstance.deleteCampaign.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to delete campaign')
    })
  })
}) 