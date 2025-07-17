import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { apiKeyValidationMiddleware, validationCache } from '../../middleware/apiKeyValidation'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getToken: vi.fn()
}))

// Mock Prisma client
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

// Mock encryption
vi.mock('../../lib/apiKeyEncryption', () => ({
  decryptApiKey: vi.fn().mockResolvedValue('valid-api-key')
}))

// Mock PipedriveService - simpler approach
vi.mock('../../server/services/pipedriveService', () => ({
  PipedriveService: vi.fn()
}))

describe('API Key Validation Middleware', () => {
  let mockRequest: NextRequest
  let mockResponse: NextResponse
  let mockTestConnection: any

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Clear the validation cache
    validationCache.clear()

    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/dashboard')
    mockResponse = NextResponse.next()

    // Set up default mocks
    const { getToken } = await import('next-auth')
    vi.mocked(getToken).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com'
    } as any)

    const { prisma } = await import('../../lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      pipedriveApiKey: 'encrypted-api-key'
    } as any)

    // Set up PipedriveService mock
    const { PipedriveService } = await import('../../server/services/pipedriveService')
    mockTestConnection = vi.fn().mockResolvedValue({
      success: true,
      user: { 
        id: 1, 
        name: 'Test User', 
        email: 'test@example.com',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    })
    
    vi.mocked(PipedriveService).mockImplementation(function (apiKey: string) {
      this.apiKey = apiKey
      this.testConnection = mockTestConnection
    })
  })

  describe('Public Routes', () => {
    it('should allow access to public routes without API key validation', async () => {
      const publicRequest = new NextRequest('http://localhost:3000/auth/signin')
      
      const result = await apiKeyValidationMiddleware(publicRequest, mockResponse)
      
      expect(result).toBe(mockResponse)
    })

    it('should allow access to API routes that don\'t require API key', async () => {
      const apiRequest = new NextRequest('http://localhost:3000/api/auth/validate-api-key')
      
      const result = await apiKeyValidationMiddleware(apiRequest, mockResponse)
      
      expect(result).toBe(mockResponse)
    })

    it('should allow access to static assets', async () => {
      const staticRequest = new NextRequest('http://localhost:3000/favicon.ico')
      
      const result = await apiKeyValidationMiddleware(staticRequest, mockResponse)
      
      expect(result).toBe(mockResponse)
    })
  })

  describe('Protected Routes - Authenticated User', () => {
    it('should allow access when user has valid API key', async () => {
      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBe(mockResponse)
    })

    it('should redirect to API key setup when user has no API key', async () => {
      const { prisma } = await import('../../lib/prisma')
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        pipedriveApiKey: null
      } as any)

      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/api-key-setup')
    })

    it('should redirect to API key setup when user has invalid API key', async () => {
      // Clear cache first
      validationCache.clear()
      
      // Set up mock to return invalid result
      mockTestConnection.mockResolvedValue({ success: false, error: 'Invalid API key' })
      
      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/api-key-setup')
    })

    it('should handle encryption errors gracefully', async () => {
      // Clear cache first
      validationCache.clear()
      
      const { decryptApiKey } = await import('../../lib/apiKeyEncryption')
      vi.mocked(decryptApiKey).mockRejectedValue(new Error('Encryption failed'))
      
      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/api-key-setup')
    })

    it('should handle database errors gracefully', async () => {
      const { prisma } = await import('../../lib/prisma')
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'))

      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/api-key-setup')
    })
  })

  describe('Protected Routes - Unauthenticated User', () => {
    it('should redirect to signin when user is not authenticated', async () => {
      const { getToken } = await import('next-auth')
      vi.mocked(getToken).mockResolvedValue(null)

      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/auth/signin')
    })

    it('should redirect to signin when token is invalid', async () => {
      const { getToken } = await import('next-auth')
      vi.mocked(getToken).mockResolvedValue({
        id: null,
        email: null
      } as any)

      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/auth/signin')
    })
  })

  describe('Route Patterns', () => {
    it('should protect dashboard routes', async () => {
      const dashboardRequest = new NextRequest('http://localhost:3000/dashboard')
      
      const result = await apiKeyValidationMiddleware(dashboardRequest, mockResponse)
      
      // Should pass through (user has valid API key in this test)
      expect(result).toBe(mockResponse)
    })

    it('should protect campaign routes', async () => {
      const campaignRequest = new NextRequest('http://localhost:3000/campaigns')
      
      const result = await apiKeyValidationMiddleware(campaignRequest, mockResponse)
      
      expect(result).toBe(mockResponse)
    })

    it('should protect contact routes', async () => {
      const contactRequest = new NextRequest('http://localhost:3000/contacts')
      
      const result = await apiKeyValidationMiddleware(contactRequest, mockResponse)
      
      expect(result).toBe(mockResponse)
    })

    it('should protect activity routes', async () => {
      const activityRequest = new NextRequest('http://localhost:3000/activities')
      
      const result = await apiKeyValidationMiddleware(activityRequest, mockResponse)
      
      expect(result).toBe(mockResponse)
    })

    it('should protect my-500 routes', async () => {
      const my500Request = new NextRequest('http://localhost:3000/my-500')
      
      const result = await apiKeyValidationMiddleware(my500Request, mockResponse)
      
      expect(result).toBe(mockResponse)
    })
  })

  describe('Performance and Caching', () => {
    it('should cache API key validation results', async () => {
      // Clear cache first
      validationCache.clear()
      
      // First call should validate
      await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      // Second call should use cache
      await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      // Should only be called once due to caching
      expect(mockTestConnection).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() => 
        apiKeyValidationMiddleware(mockRequest, mockResponse)
      )
      
      const results = await Promise.all(requests)
      
      // All should succeed
      results.forEach(result => {
        expect(result).toBe(mockResponse)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle Pipedrive API timeouts', async () => {
      // Clear cache first
      validationCache.clear()
      
      mockTestConnection.mockRejectedValue(new Error('Timeout'))

      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/api-key-setup')
    })

    it('should handle network errors gracefully', async () => {
      // Clear cache first
      validationCache.clear()
      
      mockTestConnection.mockRejectedValue(new Error('Network error'))

      const result = await apiKeyValidationMiddleware(mockRequest, mockResponse)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(302)
      expect(result?.headers.get('location')).toBe('http://localhost:3000/api-key-setup')
    })
  })
}) 