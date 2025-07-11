// Mock the CampaignService
vi.mock('@/server/services/campaignService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/campaigns/route'
import { CampaignService } from '@/server/services/campaignService'
import { getServerSession } from '@/lib/auth'
import type { Campaign, UserRole, User } from '@prisma/client'

const mockCampaignService = vi.mocked(CampaignService)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/campaigns', () => {
  let mockRequest: NextRequest
  let mockCampaignServiceInstance: any
  let mockUser: User

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

    mockCampaignServiceInstance = {
      createCampaign: vi.fn(),
      getCampaigns: vi.fn(),
    }

    // Mock the constructor to return our mock instance
    mockCampaignService.mockImplementation(() => mockCampaignServiceInstance)

    // Mock getServerSession to return a valid session
    mockGetServerSession.mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/campaigns', () => {
    it('should return campaigns with pagination', async () => {
      // Arrange
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Q1 Lead Generation',
          description: 'Target high-value prospects',
          sector: 'Technology',
          theme: 'Digital Transformation',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-03-31T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]

      const mockResponse = {
        campaigns: mockCampaigns,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      }

      mockCampaignServiceInstance.getCampaigns.mockResolvedValue(mockResponse)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns?page=1&limit=10')

      // Act
      const response = await GET(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockResponse)
      expect(mockCampaignServiceInstance.getCampaigns).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      })
    })

    it('should filter campaigns by sector', async () => {
      // Arrange
      const mockResponse = {
        campaigns: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }

      mockCampaignServiceInstance.getCampaigns.mockResolvedValue(mockResponse)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns?sector=Technology')

      // Act
      const response = await GET(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      expect(mockCampaignServiceInstance.getCampaigns).toHaveBeenCalledWith(expect.objectContaining({
        sector: 'Technology',
      }))
    })

    it('should filter campaigns by date range', async () => {
      // Arrange
      const mockResponse = {
        campaigns: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }

      mockCampaignServiceInstance.getCampaigns.mockResolvedValue(mockResponse)

      mockRequest = new NextRequest(
        'http://localhost:3000/api/campaigns?startDate=2024-01-01&endDate=2024-03-31'
      )

      // Act
      const response = await GET(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      expect(mockCampaignServiceInstance.getCampaigns).toHaveBeenCalledWith(expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }))
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockCampaignServiceInstance.getCampaigns.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns')

      // Act
      const response = await GET(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch campaigns')
    })

    it('should validate query parameters', async () => {
      // Arrange
      mockRequest = new NextRequest('http://localhost:3000/api/campaigns?page=invalid&limit=invalid')

      // Act
      const response = await GET(mockRequest)

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)
      mockRequest = new NextRequest('http://localhost:3000/api/campaigns')

      // Act
      const response = await GET(mockRequest)

      // Assert
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockCampaignServiceInstance.getCampaigns).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/campaigns', () => {
    it('should create a campaign successfully', async () => {
      // Arrange
      const campaignData = {
        name: 'Q1 Lead Generation',
        description: 'Target high-value prospects for Q1',
        sector: 'Technology',
        theme: 'Digital Transformation',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      }

      const createdCampaign = {
        id: 'campaign-123',
        ...campaignData,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-03-31T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      mockCampaignServiceInstance.createCampaign.mockResolvedValue(createdCampaign)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toEqual(createdCampaign)
      expect(mockCampaignServiceInstance.createCampaign).toHaveBeenCalledWith(expect.objectContaining({
        name: campaignData.name,
        description: campaignData.description,
        sector: campaignData.sector,
        theme: campaignData.theme,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        status: 'PLANNED',
      }))
    })

    it('should create a campaign with minimal data', async () => {
      // Arrange
      const campaignData = {
        name: 'Minimal Campaign',
      }

      const createdCampaign = {
        id: 'campaign-123',
        ...campaignData,
        description: null,
        sector: null,
        theme: null,
        startDate: null,
        endDate: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      mockCampaignServiceInstance.createCampaign.mockResolvedValue(createdCampaign)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toEqual(createdCampaign)
      expect(mockCampaignServiceInstance.createCampaign).toHaveBeenCalledWith(expect.objectContaining(campaignData))
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        description: 'Missing name field',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Name is required')
    })

    it('should validate date formats', async () => {
      // Arrange
      const campaignData = {
        name: 'Q1 Lead Generation',
        startDate: 'invalid-date',
        // endDate missing
      }
      mockRequest = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid date format')
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const campaignData = {
        name: 'Q1 Lead Generation',
      }

      mockCampaignServiceInstance.createCampaign.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create campaign')
    })

    it('should handle invalid JSON', async () => {
      // Arrange
      mockRequest = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid JSON')
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)
      mockRequest = new NextRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Campaign' }),
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockCampaignServiceInstance.createCampaign).not.toHaveBeenCalled()
    })
  })
}) 