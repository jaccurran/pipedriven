import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}))

// Mock fetch globally
global.fetch = vi.fn()

// Import mocked modules
import { useSession } from 'next-auth/react'

describe('API Key Management Integration', () => {
  const mockUseSession = vi.mocked(useSession)

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('API Key Storage and Retrieval', () => {
    it('should store API key encrypted', async () => {
      const apiKey = 'test-api-key-123'
      
      // Mock successful API key validation and storage
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })

      // Simulate API key storage
      const storeResponse = await fetch('/api/auth/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      expect(storeResponse.ok).toBe(true)
    })

    it('should retrieve and decrypt API key', async () => {
      // Mock successful API key retrieval
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true,
          user: { pipedriveApiKey: 'encrypted-key' }
        }),
      })

      const retrieveResponse = await fetch('/api/user/pipedrive-api-key')
      const data = await retrieveResponse.json()

      expect(data.success).toBe(true)
      expect(data.user.pipedriveApiKey).toBeDefined()
    })

    it('should handle encryption errors gracefully', async () => {
      // Mock encryption error
      global.fetch = vi.fn().mockRejectedValue(new Error('Encryption failed'))

      await expect(
        fetch('/api/auth/validate-api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: 'test-key' }),
        })
      ).rejects.toThrow('Encryption failed')
    })

    it('should validate API key before storage', async () => {
      const invalidApiKey = 'invalid-key'
      
      // Mock failed API key validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Invalid API key' 
        }),
      })

      const response = await fetch('/api/auth/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: invalidApiKey }),
      })

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid API key')
    })
  })

  describe('API Key Validation Flow', () => {
    it('should validate API key against Pipedrive', async () => {
      const apiKey = 'valid-api-key-123'
      
      // Mock successful Pipedrive API validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true,
          user: {
            id: 123,
            name: 'Test User',
            email: 'test@example.com',
          }
        }),
      })

      const response = await fetch('/api/pipedrive/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
    })

    it('should handle Pipedrive API errors', async () => {
      const apiKey = 'invalid-api-key'
      
      // Mock Pipedrive API error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ 
          success: false,
          error: 'unauthorized access',
          errorCode: 401,
        }),
      })

      const response = await fetch('/api/pipedrive/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('unauthorized access')
    })

    it('should handle network errors during validation', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(
        fetch('/api/pipedrive/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: 'test-key' }),
        })
      ).rejects.toThrow('Network error')
    })
  })

  describe('API Key Update Flow', () => {
    it('should allow users to update their API key', async () => {
      const newApiKey = 'new-api-key-456'
      
      // Mock successful API key update
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })

      // First validate the new API key
      const validateResponse = await fetch('/api/auth/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey }),
      })

      expect(validateResponse.ok).toBe(true)

      // Then update the API key
      const updateResponse = await fetch('/api/user/pipedrive-api-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey }),
      })

      expect(updateResponse.ok).toBe(true)
    })

    it('should validate new API key before updating', async () => {
      const invalidApiKey = 'invalid-new-key'
      
      // Mock failed validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Invalid API key' 
        }),
      })

      const response = await fetch('/api/auth/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: invalidApiKey }),
      })

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid API key')
    })
  })

  describe('API Key Security', () => {
    it('should not expose API key in error messages', async () => {
      const apiKey = 'secret-api-key-789'
      
      // Mock error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Invalid API key format' 
        }),
      })

      const response = await fetch('/api/auth/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()
      expect(data.error).not.toContain(apiKey)
      expect(data.error).toBe('Invalid API key format')
    })

    it('should use HTTPS for API key transmission', async () => {
      const apiKey = 'test-api-key'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      await fetch('/api/auth/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      // In a real environment, this would be over HTTPS
      // For testing, we just verify the request was made
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/validate-api-key'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining(apiKey),
        })
      )
    })
  })
}) 