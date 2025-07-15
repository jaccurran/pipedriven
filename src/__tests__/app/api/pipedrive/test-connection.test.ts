import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pipedrive/test-connection/route'

// Mock fetch globally
global.fetch = vi.fn()

describe('/api/pipedrive/test-connection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should return detailed success results when API key is valid', async () => {
      const mockUserData = {
        data: {
          id: 123,
          name: 'John Doe',
          email: 'john@example.com',
          company_name: 'Acme Corp',
        },
      }

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['x-ratelimit-limit', '1000'],
          ['x-ratelimit-remaining', '999'],
          ['x-ratelimit-reset', '1640995200'],
        ]),
        json: vi.fn().mockResolvedValue(mockUserData),
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/test-connection', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'test-api-key-123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Pipedrive API connection successful')
      expect(data.user).toEqual({
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
      })
      expect(data.diagnostics).toEqual({
        statusCode: 200,
        responseTime: expect.stringMatching(/\d+ms/),
        rateLimitInfo: {
          limit: '1000',
          remaining: '999',
          reset: '1640995200',
        },
        timestamp: expect.any(String),
        apiVersion: 'v1',
        endpoint: '/users/me',
      })
    })

    it('should return detailed error results when API key is invalid', async () => {
      const mockErrorData = {
        error: 'Invalid API key',
        error_info: 'The provided API key is not valid',
      }

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([
          ['x-ratelimit-limit', '1000'],
          ['x-ratelimit-remaining', '999'],
          ['x-ratelimit-reset', '1640995200'],
        ]),
        json: vi.fn().mockResolvedValue(mockErrorData),
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/test-connection', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'invalid-api-key' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Pipedrive API connection failed')
      expect(data.details).toBe('Invalid API key')
      expect(data.diagnostics).toEqual({
        statusCode: 401,
        statusText: 'Unauthorized',
        responseTime: expect.stringMatching(/\d+ms/),
        rateLimitInfo: {
          limit: '1000',
          remaining: '999',
          reset: '1640995200',
        },
        timestamp: expect.any(String),
      })
    })

    it('should handle network errors with detailed diagnostics', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/pipedrive/test-connection', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'test-api-key-123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to test Pipedrive connection')
      expect(data.details).toBe('Network error')
      expect(data.diagnostics).toEqual({
        responseTime: expect.stringMatching(/\d+ms/),
        timestamp: expect.any(String),
        errorType: 'Error',
      })
    })

    it('should validate API key is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/test-connection', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })
  })
}) 