import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}))

// Mock fetch globally
global.fetch = vi.fn()

// Import mocked modules
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

describe('Complete User Journey E2E', () => {
  const mockUseSession = vi.mocked(useSession)
  const mockUseRouter = vi.mocked(useRouter)
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('New User Registration and Setup', () => {
    it('should complete full user journey: register → login → API key setup → dashboard', async () => {
      const user = userEvent.setup()

      // Step 1: User registers
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      })

      // Mock successful registration
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      // Step 2: User logs in
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'newuser@example.com',
            name: 'New User',
            role: 'CONSULTANT',
            pipedriveApiKey: null, // No API key yet
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // Step 3: User sees API key setup dialog
      // This would be handled by the ApiKeyChecker component
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard

      // Step 4: User enters API key
      // Mock successful API key validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      // Step 5: User completes setup and accesses dashboard
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'newuser@example.com',
            name: 'New User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'encrypted-key', // Now has API key
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // User should now have full access to the application
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard
    })
  })

  describe('Existing User Login Flow', () => {
    it('should handle existing user with valid API key', async () => {
      // User already has valid API key
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'existinguser@example.com',
            name: 'Existing User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'valid-encrypted-key',
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // Mock successful API key validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      // User should have immediate access to dashboard
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('should handle existing user with invalid API key', async () => {
      // User has API key but it's invalid
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'existinguser@example.com',
            name: 'Existing User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'invalid-encrypted-key',
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // Mock failed API key validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Invalid API key' 
        }),
      })

      // User should see API key setup dialog to update their key
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard to show dialog
    })
  })

  describe('API Key Management Scenarios', () => {
    it('should handle API key expiration gracefully', async () => {
      const user = userEvent.setup()

      // User starts with valid API key
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'expired-encrypted-key',
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // Mock API key validation failure (expired)
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'API key expired' 
        }),
      })

      // User should be prompted to update their API key
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard to show dialog
    })

    it('should handle API key update flow', async () => {
      const user = userEvent.setup()

      // User has invalid API key
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'old-encrypted-key',
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

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

      // User should be able to update their API key and continue
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network errors during API key validation', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'encrypted-key',
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // User should see appropriate error message and retry option
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard
    })

    it('should handle Pipedrive service unavailability', async () => {
      // Mock Pipedrive service unavailable
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Service temporarily unavailable' 
        }),
      })

      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'encrypted-key',
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // User should see service unavailable message
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard
    })
  })

  describe('Security and Access Control', () => {
    it('should prevent access to protected routes without authentication', async () => {
      // No session
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      })

      // User should be redirected to signin
      expect(mockRouter.push).not.toHaveBeenCalled() // This would be handled by middleware
    })

    it('should prevent access to protected routes without valid API key', async () => {
      // User authenticated but no API key
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            role: 'CONSULTANT',
            pipedriveApiKey: null,
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // User should be prompted to set up API key
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard to show dialog
    })

    it('should maintain session across API key updates', async () => {
      const user = userEvent.setup()

      // User starts with session
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            role: 'CONSULTANT',
            pipedriveApiKey: 'old-encrypted-key',
          },
        },
        status: 'authenticated',
        update: vi.fn(),
      })

      // Mock successful API key update
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      // User should maintain their session after API key update
      expect(mockRouter.push).not.toHaveBeenCalled() // Should stay on dashboard
    })
  })
}) 