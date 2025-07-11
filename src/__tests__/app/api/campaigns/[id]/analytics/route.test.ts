import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/campaigns/[id]/analytics/route'
import { CampaignService } from '@/server/services/campaignService'
import type { ActivityType } from '@prisma/client'

// Mock the CampaignService
vi.mock('@/server/services/campaignService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

const mockCampaignService = vi.mocked(CampaignService)

describe('/api/campaigns/[id]/analytics', () => {
  let mockRequest: NextRequest
  let mockCampaignServiceInstance: any

  beforeEach(() => {
    mockCampaignServiceInstance = {
      getCampaignAnalytics: vi.fn(),
      getCampaignPerformance: vi.fn(),
    }

    // Mock the constructor to return our mock instance
    mockCampaignService.mockImplementation(() => mockCampaignServiceInstance)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/campaigns/[id]/analytics', () => {
    it('should return campaign analytics', async () => {
      // Arrange
      const mockAnalytics = {
        totalContacts: 25,
        totalActivities: 15,
        activityBreakdown: {
          EMAIL: 5,
          CALL: 3,
          MEETING: 2,
          LINKEDIN: 3,
          REFERRAL: 1,
          CONFERENCE: 1,
        } as Record<ActivityType, number>,
        meetingsRequested: 2,
        meetingsBooked: 1,
      }

      mockCampaignServiceInstance.getCampaignAnalytics.mockResolvedValue(mockAnalytics)

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/analytics')

      // Act
      const response = await GET(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockAnalytics)
      expect(mockCampaignServiceInstance.getCampaignAnalytics).toHaveBeenCalledWith('campaign-123')
    })

    it('should return 404 when campaign not found', async () => {
      // Arrange
      mockCampaignServiceInstance.getCampaignAnalytics.mockRejectedValue(new Error('Campaign not found'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/non-existent/analytics')

      // Act
      const response = await GET(mockRequest, { params: { id: 'non-existent' } })

      // Assert
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Campaign not found')
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockCampaignServiceInstance.getCampaignAnalytics.mockRejectedValue(new Error('Database error'))

      mockRequest = new NextRequest('http://localhost:3000/api/campaigns/campaign-123/analytics')

      // Act
      const response = await GET(mockRequest, { params: { id: 'campaign-123' } })

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch campaign analytics')
    })
  })
}) 