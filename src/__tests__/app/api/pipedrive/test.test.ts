import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pipedrive/test/route'
import { prisma } from '../../../setup'
import { getServerSession } from 'next-auth'
import { createPipedriveService } from '@/server/services/pipedriveService'

// Mock dependencies
vi.mock('next-auth')
vi.mock('@/server/services/pipedriveService')

describe('/api/pipedrive/test', () => {
  let mockUser: any

  beforeEach(async () => {
    // Clean up database
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

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should return success when connection test passes', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service
      const mockService = {
        testConnection: vi.fn().mockResolvedValue({
          success: true,
          user: {
            id: 123,
            name: 'Test User',
            email: 'test@example.com',
          },
        }),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/test', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Pipedrive API connection successful')
      expect(data.user).toEqual({
        id: 123,
        name: 'Test User',
        email: 'test@example.com',
      })
      expect(createPipedriveService).toHaveBeenCalledWith(mockUser.id)
      expect(mockService.testConnection).toHaveBeenCalled()
    })

    it('should return error when user is not authenticated', async () => {
      // Mock no session
      vi.mocked(getServerSession).mockResolvedValue(null)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/test', {
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
      const request = new NextRequest('http://localhost:3000/api/pipedrive/test', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(400)
      expect(data.error).toBe('No Pipedrive API key configured')
    })

    it('should return error when connection test fails', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service with failed connection
      const mockService = {
        testConnection: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid API key',
        }),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/test', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid API key')
    })

    it('should handle service errors gracefully', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
      } as any)

      // Mock Pipedrive service that throws error
      const mockService = {
        testConnection: vi.fn().mockRejectedValue(new Error('Service error')),
      }
      vi.mocked(createPipedriveService).mockResolvedValue(mockService as any)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pipedrive/test', {
        method: 'POST',
      })

      // Call API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
}) 