import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PipedriveService } from '@/server/services/pipedriveService'
import type { Activity, ActivityType } from '@prisma/client'

// Mock the pipedrive config
vi.mock('@/lib/pipedrive-config', () => ({
  pipedriveConfig: {
    enableDataSanitization: false,
    maxSubjectLength: 100,
    maxNoteLength: 1000,
  },
  getPipedriveApiUrl: () => 'https://api.pipedrive.com/v1',
  validatePipedriveConfig: () => [],
}))

// Mock the API key encryption
vi.mock('@/lib/apiKeyEncryption', () => ({
  decryptApiKey: vi.fn().mockResolvedValue('test-api-key'),
}))

describe('PipedriveService - Shortcode Integration', () => {
  let pipedriveService: PipedriveService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    // Create service instance
    pipedriveService = new PipedriveService('test-api-key')
  })

  describe('createActivity with shortcode', () => {
    it('should include campaign shortcode in activity subject', async () => {
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
        subject: 'Test call',
        note: 'Test note',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: 'campaign-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '123',
          pipedriveOrgId: '456',
          name: 'John Doe',
          organisation: 'Test Org'
        },
        user: {
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        campaign: {
          name: 'Adult Social Care',
          shortcode: 'ASC'
        }
      }

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 789 }
        }),
        json: async () => ({
          success: true,
          data: { id: 789 }
        })
      })

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(789)
      
      // Verify the API call was made with the correct subject including shortcode
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"[CMPGN-ASC] Test call"')
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
        id: 'activity-2',
        type: 'EMAIL' as ActivityType,
        subject: 'Test email',
        note: 'Test note',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: 'campaign-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '123',
          pipedriveOrgId: '456',
          name: 'John Doe',
          organisation: 'Test Org'
        },
        user: {
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        campaign: {
          name: 'Adult Social Care',
          shortcode: null // No shortcode
        }
      }

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 790 }
        }),
        json: async () => ({
          success: true,
          data: { id: 790 }
        })
      })

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(790)
      
      // Verify the API call was made with the correct subject without shortcode
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"Test email"')
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
        id: 'activity-3',
        type: 'MEETING' as ActivityType,
        subject: 'Test meeting',
        note: 'Test note',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        contactId: 'contact-1',
        campaignId: null,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: {
          pipedrivePersonId: '123',
          pipedriveOrgId: '456',
          name: 'John Doe',
          organisation: 'Test Org'
        },
        user: {
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        campaign: undefined // No campaign
      }

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          data: { id: 791 }
        }),
        json: async () => ({
          success: true,
          data: { id: 791 }
        })
      })

      // Act
      const result = await pipedriveService.createActivity(mockActivity)

      // Assert
      expect(result.success).toBe(true)
      expect(result.activityId).toBe(791)
      
      // Verify the API call was made with the correct subject without campaign context
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"Test meeting"')
        })
      )
    })

    it('should handle different activity types with shortcode', async () => {
      // Arrange
      const activityTypes: ActivityType[] = ['CALL', 'EMAIL', 'MEETING', 'MEETING_REQUEST', 'LINKEDIN', 'REFERRAL', 'CONFERENCE']
      
      for (const activityType of activityTypes) {
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
          id: `activity-${activityType}`,
          type: activityType,
          subject: `Test ${activityType.toLowerCase()}`,
          note: 'Test note',
          dueDate: new Date('2024-01-15T10:00:00Z'),
          contactId: 'contact-1',
          campaignId: 'campaign-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          contact: {
            pipedrivePersonId: '123',
            pipedriveOrgId: '456',
            name: 'John Doe',
            organisation: 'Test Org'
          },
          user: {
            name: 'Jane Smith',
            email: 'jane@example.com'
          },
          campaign: {
            name: 'Temp Accom',
            shortcode: 'TA'
          }
        }

        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({
            success: true,
            data: { id: 800 + activityTypes.indexOf(activityType) }
          }),
          json: async () => ({
            success: true,
            data: { id: 800 + activityTypes.indexOf(activityType) }
          })
        })

        // Act
        const result = await pipedriveService.createActivity(mockActivity)

        // Assert
        expect(result.success).toBe(true)
        
        // Verify the API call was made with the correct subject including shortcode
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.pipedrive.com/v1/activities?api_token=test-api-key',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(`[CMPGN-TA]`)
          })
        )
      }
    })
  })
}) 