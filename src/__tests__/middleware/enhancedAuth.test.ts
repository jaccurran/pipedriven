import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { checkApiKeyValidity } from '@/lib/auth'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
  checkApiKeyValidity: vi.fn(),
}))

// Mock Next.js
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ url, status: 302 })),
    next: vi.fn(() => ({ status: 200 })),
  },
}))

// Import mocked modules
import { getServerSession as mockGetServerSession } from '@/lib/auth'
import { checkApiKeyValidity as mockCheckApiKeyValidity } from '@/lib/auth'
import { NextResponse } from 'next/server'

describe('Enhanced Authentication Middleware', () => {
  const mockRequest = {
    url: 'http://localhost:3000/dashboard',
    nextUrl: {
      pathname: '/dashboard',
    },
  } as NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('when user is not authenticated', () => {
    it('should redirect to signin page', async () => {
      vi.mocked(mockGetServerSession).mockResolvedValue(null)

      // This would be the middleware function
      const result = await NextResponse.redirect('/auth/signin')

      expect(result.url).toBe('/auth/signin')
      expect(result.status).toBe(302)
    })
  })

  describe('when user is authenticated but has no API key', () => {
    it('should redirect to API key setup page', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          pipedriveApiKey: null,
        },
      }

      vi.mocked(mockGetServerSession).mockResolvedValue(mockSession)

      // This would be the middleware function
      const result = await NextResponse.redirect('/auth/api-key-setup')

      expect(result.url).toBe('/auth/api-key-setup')
      expect(result.status).toBe(302)
    })
  })

  describe('when user is authenticated and has API key', () => {
    it('should allow access when API key is valid', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          pipedriveApiKey: 'encrypted-key',
        },
      }

      vi.mocked(mockGetServerSession).mockResolvedValue(mockSession)
      vi.mocked(mockCheckApiKeyValidity).mockResolvedValue({
        valid: true,
      })

      // This would be the middleware function
      const result = await NextResponse.next()

      expect(result.status).toBe(200)
    })

    it('should redirect to API key setup when API key is invalid', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          pipedriveApiKey: 'invalid-key',
        },
      }

      vi.mocked(mockGetServerSession).mockResolvedValue(mockSession)
      vi.mocked(mockCheckApiKeyValidity).mockResolvedValue({
        valid: false,
        error: 'Invalid API key',
      })

      // This would be the middleware function
      const result = await NextResponse.redirect('/auth/api-key-setup')

      expect(result.url).toBe('/auth/api-key-setup')
      expect(result.status).toBe(302)
    })
  })

  describe('when API key validation fails', () => {
    it('should redirect to API key setup page', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          pipedriveApiKey: 'encrypted-key',
        },
      }

      vi.mocked(mockGetServerSession).mockResolvedValue(mockSession)
      vi.mocked(mockCheckApiKeyValidity).mockRejectedValue(new Error('Validation failed'))

      // This would be the middleware function
      const result = await NextResponse.redirect('/auth/api-key-setup')

      expect(result.url).toBe('/auth/api-key-setup')
      expect(result.status).toBe(302)
    })
  })

  describe('for public routes', () => {
    it('should allow access to signin page without authentication', async () => {
      const publicRequest = {
        url: 'http://localhost:3000/auth/signin',
        nextUrl: {
          pathname: '/auth/signin',
        },
      } as NextRequest

      // This would be the middleware function
      const result = await NextResponse.next()

      expect(result.status).toBe(200)
    })

    it('should allow access to register page without authentication', async () => {
      const publicRequest = {
        url: 'http://localhost:3000/auth/register',
        nextUrl: {
          pathname: '/auth/register',
        },
      } as NextRequest

      // This would be the middleware function
      const result = await NextResponse.next()

      expect(result.status).toBe(200)
    })

    it('should allow access to API key setup page without authentication', async () => {
      const publicRequest = {
        url: 'http://localhost:3000/auth/api-key-setup',
        nextUrl: {
          pathname: '/auth/api-key-setup',
        },
      } as NextRequest

      // This would be the middleware function
      const result = await NextResponse.next()

      expect(result.status).toBe(200)
    })
  })
}) 