import { NextRequest } from 'next/server'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { POST } from '@/app/api/pipedrive/organizations/search/route'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('@/server/services/pipedriveService', () => ({
  PipedriveService: vi.fn()
}))

const mockGetServerSession = vi.mocked(await import('next-auth')).getServerSession
const mockPrisma = vi.mocked(await import('@/lib/prisma')).prisma
const mockPipedriveService = vi.mocked(await import('@/server/services/pipedriveService')).PipedriveService

describe('/api/pipedrive/organizations/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should search organizations successfully', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockUser = {
        pipedriveApiKey: 'test-api-key'
      }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockPipedriveInstance = {
        searchOrganizations: vi.fn().mockResolvedValue([
          { id: 'org-1', name: 'Acme Corp', address: '123 Main St' },
          { id: 'org-2', name: 'Tech Solutions', address: '456 Oak Ave' }
        ])
      }
      mockPipedriveService.mockImplementation(() => mockPipedriveInstance)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'acme' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(2)
      expect(data.results[0].name).toBe('Acme Corp')
      expect(data.results[1].name).toBe('Tech Solutions')
      expect(mockPipedriveInstance.searchOrganizations).toHaveBeenCalledWith('acme')
    })

    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'acme' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for missing query', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({})
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Query is required')
    })

    it('should return 400 for query too short', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'ab' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Query must be at least 3 characters long')
      expect(data.results).toEqual([])
    })

    it('should return 400 when user has no Pipedrive API key', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      mockPrisma.user.findUnique.mockResolvedValue({ pipedriveApiKey: null } as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'acme' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Pipedrive API key not configured')
      expect(data.results).toEqual([])
    })

    it('should handle Pipedrive search errors gracefully', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockUser = {
        pipedriveApiKey: 'test-api-key'
      }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockPipedriveInstance = {
        searchOrganizations: vi.fn().mockRejectedValue(new Error('Pipedrive API error'))
      }
      mockPipedriveService.mockImplementation(() => mockPipedriveInstance)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'acme' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toEqual([])
    })

    it('should implement rate limiting', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockUser = {
        pipedriveApiKey: 'test-api-key'
      }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockPipedriveInstance = {
        searchOrganizations: vi.fn().mockResolvedValue([])
      }
      mockPipedriveService.mockImplementation(() => mockPipedriveInstance)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'acme' })
      })

      // Act - Make multiple requests quickly
      const responses = await Promise.all([
        POST(request),
        POST(request),
        POST(request)
      ])

      // Assert - Should rate limit after first request
      expect(responses[0].status).toBe(200)
      expect(responses[1].status).toBe(429)
      expect(responses[2].status).toBe(429)
    })

    it('should implement caching', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockUser = {
        pipedriveApiKey: 'test-api-key'
      }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockPipedriveInstance = {
        searchOrganizations: vi.fn().mockResolvedValue([
          { id: 'org-1', name: 'Acme Corp' }
        ])
      }
      mockPipedriveService.mockImplementation(() => mockPipedriveInstance)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'acme' })
      })

      // Act - Make same request twice
      const response1 = await POST(request)
      const response2 = await POST(request)

      // Assert - Second request should be cached
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      const data1 = await response1.json()
      const data2 = await response2.json()
      
      expect(data1.cached).toBe(false)
      expect(data2.cached).toBe(true)
      expect(mockPipedriveInstance.searchOrganizations).toHaveBeenCalledTimes(1)
    })

    it('should handle invalid JSON in request body', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: 'invalid json'
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should return empty results when no organizations found', async () => {
      // Arrange
      const mockSession = {
        user: { email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockUser = {
        pipedriveApiKey: 'test-api-key'
      }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockPipedriveInstance = {
        searchOrganizations: vi.fn().mockResolvedValue([])
      }
      mockPipedriveService.mockImplementation(() => mockPipedriveInstance)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/organizations/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'nonexistent' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toEqual([])
    })
  })
}) 