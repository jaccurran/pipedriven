import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PipedriveService } from '@/server/services/pipedriveService'
import { createPipedriveService } from '@/server/services/pipedriveService'
import { prisma } from '@/lib/prisma'
import type { Activity, ActivityType, User, Contact, Campaign } from '@prisma/client'

// Mock fetch globally
global.fetch = vi.fn()

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const mockPrisma = vi.mocked(prisma)

describe('PipedriveService - CMPGN Format Tests', () => {
  let pipedriveService: PipedriveService
  let mockUser: User
  let mockContact: Contact
  let mockCampaign: Campaign

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock user
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'CONSULTANT',
      password: 'hashed-password',
      pipedriveApiKey: 'test-api-key',
      pipedriveUserId: 123,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: null,
      image: null,
      lastSyncTimestamp: null,
      syncStatus: 'SYNCED',
      quickActionMode: 'SIMPLE',
      emailNotifications: true,
      activityReminders: true,
      campaignUpdates: true,
      syncStatusAlerts: true,
    }

    // Mock contact
    mockContact = {
      id: 'contact-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      organisation: 'Test Organization',
      warmnessScore: 5,
      lastContacted: new Date(),
      addedToCampaign: true,
      pipedrivePersonId: '456',
      pipedriveOrgId: '789',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-1',
    }

    // Mock campaign
    mockCampaign = {
      id: 'campaign-1',
      name: 'Adult Social Care',
      shortcode: 'ASC',
      description: 'UK campaign',
      status: 'ACTIVE',
      sector: 'Healthcare',
      theme: 'Social Care',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      targetLeads: 100,
      budget: 50000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    pipedriveService = new PipedriveService('test-api-key')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Activity subject formatting with CMPGN prefix', () => {
    it('should format activity subject with CMPGN-SHORTCODE prefix', async () => {
      // Arrange
      const mockActivity: Activity & {
        contact?: {
          pipedrivePersonId?: string | null
          pipedriveOrgId?: string | null
          name?: string
          organisation?: string | null
        }
        user?: {
          name?: string | null
          email?: string | null
        }
        campaign?: {
          name?: string | null
          shortcode?: string | null
        }
      } = {
        id: 'activity-1',
        type: 'CALL' as ActivityType,
        subject: 'Follow-up call',
        note: 'Important follow-up call',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: 'campaign-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '456',
          pipedriveOrgId: '789',
          name: 'John Doe',
          organisation: 'Test Organization'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: {
          name: 'Adult Social Care',
          shortcode: 'ASC'
        }
      }

      // Mock successful API response
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 123 }
        }),
        json: async () => ({
          success: true,
          data: { id: 123 }
        })
      } as any)

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(123)
      
      // Verify the API call was made with the correct CMPGN format
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"[CMPGN-ASC] Follow-up call"')
        })
      )
    })

    it('should handle different campaign shortcodes correctly', async () => {
      // Arrange
      const mockActivity: Activity & {
        contact?: {
          pipedrivePersonId?: string | null
          pipedriveOrgId?: string | null
          name?: string
          organisation?: string | null
        }
        user?: {
          name?: string | null
          email?: string | null
        }
        campaign?: {
          name?: string | null
          shortcode?: string | null
        }
      } = {
        id: 'activity-2',
        type: 'EMAIL' as ActivityType,
        subject: 'Initial outreach',
        note: 'First contact email',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: 'campaign-2',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '456',
          pipedriveOrgId: '789',
          name: 'John Doe',
          organisation: 'Test Organization'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: {
          name: 'Temp Accom',
          shortcode: 'TEMP'
        }
      }

      // Mock successful API response
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 124 }
        }),
        json: async () => ({
          success: true,
          data: { id: 124 }
        })
      } as any)

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(124)
      
      // Verify the API call was made with the correct CMPGN format
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"[CMPGN-TEMP] Initial outreach"')
        })
      )
    })

    it('should handle activity without campaign shortcode', async () => {
      // Arrange
      const mockActivity: Activity & {
        contact?: {
          pipedrivePersonId?: string | null
          pipedriveOrgId?: string | null
          name?: string
          organisation?: string | null
        }
        user?: {
          name?: string | null
          email?: string | null
        }
        campaign?: {
          name?: string | null
          shortcode?: string | null
        }
      } = {
        id: 'activity-3',
        type: 'MEETING' as ActivityType,
        subject: 'General meeting',
        note: 'General business meeting',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: 'campaign-3',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '456',
          pipedriveOrgId: '789',
          name: 'John Doe',
          organisation: 'Test Organization'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: {
          name: 'General Campaign',
          shortcode: null // No shortcode
        }
      }

      // Mock successful API response
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 125 }
        }),
        json: async () => ({
          success: true,
          data: { id: 125 }
        })
      } as any)

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(125)
      
      // Verify the API call was made without CMPGN prefix
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"General meeting"')
        })
      )
      
      // Verify CMPGN prefix is NOT present
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.not.stringContaining('"subject":"[CMPGN-')
        })
      )
    })

    it('should handle activity without campaign', async () => {
      // Arrange
      const mockActivity: Activity & {
        contact?: {
          pipedrivePersonId?: string | null
          pipedriveOrgId?: string | null
          name?: string
          organisation?: string | null
        }
        user?: {
          name?: string | null
          email?: string | null
        }
        campaign?: {
          name?: string | null
          shortcode?: string | null
        }
      } = {
        id: 'activity-4',
        type: 'LINKEDIN' as ActivityType,
        subject: 'LinkedIn connection',
        note: 'LinkedIn outreach',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: null, // No campaign
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '456',
          pipedriveOrgId: '789',
          name: 'John Doe',
          organisation: 'Test Organization'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: undefined // No campaign
      }

      // Mock successful API response
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 126 }
        }),
        json: async () => ({
          success: true,
          data: { id: 126 }
        })
      } as any)

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(126)
      
      // Verify the API call was made without CMPGN prefix
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"LinkedIn connection"')
        })
      )
      
      // Verify CMPGN prefix is NOT present
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.not.stringContaining('"subject":"[CMPGN-')
        })
      )
    })

    it('should handle default subject generation with CMPGN prefix', async () => {
      // Arrange
      const mockActivity: Activity & {
        contact?: {
          pipedrivePersonId?: string | null
          pipedriveOrgId?: string | null
          name?: string
          organisation?: string | null
        }
        user?: {
          name?: string | null
          email?: string | null
        }
        campaign?: {
          name?: string | null
          shortcode?: string | null
        }
      } = {
        id: 'activity-5',
        type: 'EMAIL' as ActivityType,
        subject: '', // Empty subject - should use default
        note: 'Email communication',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: 'campaign-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '456',
          pipedriveOrgId: '789',
          name: 'John Doe',
          organisation: 'Test Organization'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: {
          name: 'Adult Social Care',
          shortcode: 'ASC'
        }
      }

      // Mock successful API response
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 127 }
        }),
        json: async () => ({
          success: true,
          data: { id: 127 }
        })
      } as any)

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(127)
      
      // Verify the API call was made with the correct CMPGN format and default subject
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"[CMPGN-ASC] 📧 Email Communication - John Doe by Test User (Adult Social Care)"')
        })
      )
    })
  })
}) 