import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/pipedrive/contacts/sync/route'
import { prisma } from '../../../../setup'
import { getServerSession } from 'next-auth'
import { createPipedriveService } from '@/server/services/pipedriveService'

// Mock dependencies
vi.mock('next-auth')
vi.mock('@/server/services/pipedriveService')

describe('/api/pipedrive/contacts/sync', () => {
  let mockUser: any
  let mockContacts: any[]

  beforeEach(async () => {
    // Clean up database
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

    // Create test contacts
    mockContacts = await Promise.all([
      prisma.contact.create({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          organisation: 'Acme Corp',
          userId: mockUser.id,
        },
      }),
      prisma.contact.create({
        data: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+0987654321',
          organisation: 'Tech Inc',
          userId: mockUser.id,
        },
      }),
    ])

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should sync contacts successfully', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service
      const mockService = {
        createOrUpdatePerson: vi.fn()
          .mockResolvedValueOnce({ success: true, personId: 123 })
          .mockResolvedValueOnce({ success: true, personId: 456 }),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Synced 2 contacts to Pipedrive')
      expect(data.synced).toBe(2)
      expect(data.failed).toBe(0)
      expect(data.total).toBe(2)
      expect(mockService.createOrUpdatePerson).toHaveBeenCalledTimes(2)
    })

    it('should handle partial sync failures', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service with one failure
      const mockService = {
        createOrUpdatePerson: vi.fn()
          .mockResolvedValueOnce({ success: true, personId: 123 })
          .mockResolvedValueOnce({ success: false, error: 'API error' }),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Synced 1 contacts to Pipedrive')
      expect(data.synced).toBe(1)
      expect(data.failed).toBe(1)
      expect(data.total).toBe(2)
    })

    it('should return success when no contacts exist', async () => {
      // Delete all contacts
      await prisma.contact.deleteMany()

      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service
      const mockService = {
        createOrUpdatePerson: vi.fn(),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('No contacts to sync')
      expect(data.synced).toBe(0)
      expect(data.failed).toBe(0)
      expect(mockService.createOrUpdatePerson).not.toHaveBeenCalled()
    })

    it('should return error when user is not authenticated', async () => {
      // Mock no session
      vi.mocked(getServerSession).mockResolvedValue(null)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return error when user has no API key', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock no Pipedrive service (no API key)
      vi.mocked(createPipedriveService).mockResolvedValue(null)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(400)
      expect(data.error).toBe('No Pipedrive API key configured')
    })
  })

  describe('GET', () => {
    it('should fetch persons from Pipedrive successfully', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service
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

      const mockService = {
        getPersons: vi.fn().mockResolvedValue({
          success: true,
          persons: mockPersons,
        }),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'GET',
      })

      // Call API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.persons).toEqual(mockPersons)
      expect(data.count).toBe(1)
      expect(mockService.getPersons).toHaveBeenCalled()
    })

    it('should handle API errors when fetching persons', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service with error
      const mockService = {
        getPersons: vi.fn().mockResolvedValue({
          success: false,
          error: 'Rate limit exceeded',
        }),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'GET',
      })

      // Call API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Rate limit exceeded')
    })

    it('should return error when user is not authenticated', async () => {
      // Mock no session
      vi.mocked(getServerSession).mockResolvedValue(null)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'GET',
      })

      // Call API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return error when user has no API key', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock no Pipedrive service (no API key)
      vi.mocked(createPipedriveService).mockResolvedValue(null)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'GET',
      })

      // Call API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(400)
      expect(data.error).toBe('No Pipedrive API key configured')
    })
  })
}) 