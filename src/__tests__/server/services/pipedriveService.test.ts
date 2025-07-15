import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PipedriveService, createPipedriveService } from '@/server/services/pipedriveService'
import { prisma } from '../../setup'
import type { User, Contact, Activity, ActivityType } from '@prisma/client'

// Mock fetch globally
global.fetch = vi.fn()

describe('PipedriveService', () => {
  let service: PipedriveService
  let mockUser: User
  let mockContact: Contact
  let mockActivity: Activity

  beforeEach(async () => {
    // Clean up database
    await prisma.activity.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    mockUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'CONSULTANT',
        pipedriveApiKey: 'test-api-key-123',
      },
    })

    // Create test contact
    mockContact = await prisma.contact.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organisation: 'Acme Corp',
        userId: mockUser.id,
      },
    })

    // Create test activity
    mockActivity = await prisma.activity.create({
      data: {
        type: 'CALL',
        subject: 'Follow up call',
        note: 'Discuss project details',
        dueDate: new Date('2025-12-25T10:00:00Z'),
        userId: mockUser.id,
        contactId: mockContact.id,
      },
    })

    // Create service instance
    service = new PipedriveService('test-api-key-123')

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('testConnection', () => {
    it('should return success when API key is valid', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            id: 123,
            name: 'Test User',
            email: 'test@example.com',
          },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.testConnection()

      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: 123,
        name: 'Test User',
        email: 'test@example.com',
      })
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/users/me?api_token=test-api-key-123',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should return error when API key is invalid', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Invalid API key',
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })

    it('should handle network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to connect to Pipedrive API')
    })
  })

  describe('createOrUpdatePerson', () => {
    it('should create a new person when contact has no Pipedrive ID', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            id: 456,
            name: 'John Doe',
            email: ['john@example.com'],
            phone: ['+1234567890'],
          },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.createOrUpdatePerson(mockContact)

      expect(result.success).toBe(true)
      expect(result.personId).toBe(456)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/persons?api_token=test-api-key-123',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"John Doe"'),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )

      // Verify contact was updated with Pipedrive ID
      const updatedContact = await prisma.contact.findUnique({
        where: { id: mockContact.id },
      })
      expect(updatedContact?.pipedrivePersonId).toBe('456')
    })

    it('should update existing person when contact has Pipedrive ID', async () => {
      // Update contact with Pipedrive ID
      await prisma.contact.update({
        where: { id: mockContact.id },
        data: { pipedrivePersonId: '789' },
      })

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            id: 789,
            name: 'John Doe Updated',
          },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const updatedContact = await prisma.contact.findUnique({
        where: { id: mockContact.id },
      })

      const result = await service.createOrUpdatePerson(updatedContact!)

      expect(result.success).toBe(true)
      expect(result.personId).toBe(789)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/persons/789?api_token=test-api-key-123',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should handle missing email and phone gracefully', async () => {
      const contactWithoutContact = await prisma.contact.create({
        data: {
          name: 'Jane Doe',
          userId: mockUser.id,
        },
      })

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: 123 },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.createOrUpdatePerson(contactWithoutContact)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/persons?api_token=test-api-key-123',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'Jane Doe',
            email: [],
            phone: [],
            org_name: undefined,
          }),
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Validation failed',
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.createOrUpdatePerson(mockContact)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })
  })

  describe('createActivity', () => {
    it('should create an activity with all fields', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            id: 123,
            subject: 'Follow up call',
            type: 'call',
          },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.createActivity(mockActivity)

      expect(result.success).toBe(true)
      expect(result.activityId).toBe(123)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key-123',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"Follow up call"'),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should map activity types correctly', async () => {
      const activityTypes: ActivityType[] = ['CALL', 'EMAIL', 'MEETING', 'LINKEDIN', 'REFERRAL', 'CONFERENCE']
      const expectedTypes = ['call', 'email', 'meeting', 'task', 'task', 'meeting']

      for (let i = 0; i < activityTypes.length; i++) {
        const activity = await prisma.activity.create({
          data: {
            type: activityTypes[i],
            subject: `Test ${activityTypes[i]}`,
            userId: mockUser.id,
          },
        })

        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: { id: 123 },
          }),
        }
        vi.mocked(fetch).mockResolvedValue(mockResponse as any)

        await service.createActivity(activity)

        expect(fetch).toHaveBeenCalledWith(
          'https://api.pipedrive.com/v1/activities?api_token=test-api-key-123',
          expect.objectContaining({
            body: expect.stringContaining(`"type":"${expectedTypes[i]}"`),
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      }
    })

    it('should handle activity with contact that has Pipedrive ID', async () => {
      // Update contact with Pipedrive ID
      await prisma.contact.update({
        where: { id: mockContact.id },
        data: { pipedrivePersonId: '456' },
      })

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: 123 },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const activityWithContact = await prisma.activity.findUnique({
        where: { id: mockActivity.id },
        include: { contact: true },
      })

      const result = await service.createActivity(activityWithContact!)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key-123',
        expect.objectContaining({
          body: expect.stringContaining('"person_id":456'),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should handle activity without due date', async () => {
      const activityWithoutDate = await prisma.activity.create({
        data: {
          type: 'EMAIL',
          subject: 'Send email',
          userId: mockUser.id,
        },
      })

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: 123 },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.createActivity(activityWithoutDate)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/activities?api_token=test-api-key-123',
        expect.objectContaining({
          body: expect.stringContaining('"subject":"Send email"'),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })
  })

  describe('getPersons', () => {
    it('should fetch persons successfully', async () => {
      const mockPersons = [
        {
          id: 1,
          name: 'John Doe',
          email: ['john@example.com'],
          phone: ['+1234567890'],
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
        },
      ]

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: mockPersons,
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.getPersons()

      expect(result.success).toBe(true)
      expect(result.persons).toEqual(mockPersons)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/persons?api_token=test-api-key-123',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should handle API errors when fetching persons', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Rate limit exceeded',
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.getPersons()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
    })
  })

  describe('getOrganizations', () => {
    it('should fetch organizations successfully', async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: 'Acme Corp',
          address: '123 Main St',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
        },
      ]

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: mockOrganizations,
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await service.getOrganizations()

      expect(result.success).toBe(true)
      expect(result.organizations).toEqual(mockOrganizations)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/organizations?api_token=test-api-key-123',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })
  })

  describe('createPipedriveService factory', () => {
    it('should create service when user has API key', async () => {
      const service = await createPipedriveService(mockUser.id)

      expect(service).toBeInstanceOf(PipedriveService)
    })

    it('should return null when user has no API key', async () => {
      const userWithoutKey = await prisma.user.create({
        data: {
          email: 'nokey@example.com',
          name: 'No Key User',
          role: 'CONSULTANT',
        },
      })

      const service = await createPipedriveService(userWithoutKey.id)

      expect(service).toBeNull()
    })

    it('should return null when user does not exist', async () => {
      const service = await createPipedriveService('non-existent-id')

      expect(service).toBeNull()
    })
  })
}) 