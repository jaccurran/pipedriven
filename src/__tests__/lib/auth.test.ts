import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasRole, requireAuth, requireRole } from '@/lib/auth'
import type { UserRole } from '@prisma/client'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasRole', () => {
    it('should return true when user has higher role than required', () => {
      expect(hasRole('GOLDEN_TICKET', 'CONSULTANT')).toBe(true)
    })

    it('should return true when user has same role as required', () => {
      expect(hasRole('CONSULTANT', 'CONSULTANT')).toBe(true)
      expect(hasRole('GOLDEN_TICKET', 'GOLDEN_TICKET')).toBe(true)
    })

    it('should return false when user has lower role than required', () => {
      expect(hasRole('CONSULTANT', 'GOLDEN_TICKET')).toBe(false)
    })

    it('should handle all role combinations correctly', () => {
      // CONSULTANT role tests
      expect(hasRole('CONSULTANT', 'CONSULTANT')).toBe(true)
      expect(hasRole('CONSULTANT', 'GOLDEN_TICKET')).toBe(false)

      // GOLDEN_TICKET role tests
      expect(hasRole('GOLDEN_TICKET', 'CONSULTANT')).toBe(true)
      expect(hasRole('GOLDEN_TICKET', 'GOLDEN_TICKET')).toBe(true)
    })
  })

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'CONSULTANT' as UserRole,
      }

      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: mockUser,
        expires: new Date().toISOString(),
      })

      const authMiddleware = requireAuth()
      const result = await authMiddleware({} as Request)

      expect(result).toEqual(mockUser)
    })

    it('should throw error when not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const authMiddleware = requireAuth()

      await expect(authMiddleware({} as Request)).rejects.toThrow('Authentication required')
    })

    it('should throw error when session exists but no user', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        expires: new Date().toISOString(),
      })

      const authMiddleware = requireAuth()

      await expect(authMiddleware({} as Request)).rejects.toThrow('Authentication required')
    })
  })

  describe('requireRole', () => {
    it('should return user when authenticated with sufficient role', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'GOLDEN_TICKET' as UserRole,
      }

      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: mockUser,
        expires: new Date().toISOString(),
      })

      const roleMiddleware = requireRole('CONSULTANT')
      const result = await roleMiddleware({} as Request)

      expect(result).toEqual(mockUser)
    })

    it('should return user when authenticated with exact required role', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'CONSULTANT' as UserRole,
      }

      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: mockUser,
        expires: new Date().toISOString(),
      })

      const roleMiddleware = requireRole('CONSULTANT')
      const result = await roleMiddleware({} as Request)

      expect(result).toEqual(mockUser)
    })

    it('should throw error when not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const roleMiddleware = requireRole('CONSULTANT')

      await expect(roleMiddleware({} as Request)).rejects.toThrow('Authentication required')
    })

    it('should throw error when user has insufficient role', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'CONSULTANT' as UserRole,
      }

      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: mockUser,
        expires: new Date().toISOString(),
      })

      const roleMiddleware = requireRole('GOLDEN_TICKET')

      await expect(roleMiddleware({} as Request)).rejects.toThrow('Insufficient permissions')
    })

    it('should handle all role requirement scenarios', async () => {
      const { getServerSession } = await import('next-auth')

      // Test CONSULTANT requiring GOLDEN_TICKET (should fail)
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'CONSULTANT' as UserRole },
        expires: new Date().toISOString(),
      })

      const consultantMiddleware = requireRole('GOLDEN_TICKET')
      await expect(consultantMiddleware({} as Request)).rejects.toThrow('Insufficient permissions')

      // Test GOLDEN_TICKET requiring CONSULTANT (should succeed)
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '2', email: 'test@example.com', role: 'GOLDEN_TICKET' as UserRole },
        expires: new Date().toISOString(),
      })

      const goldenTicketMiddleware = requireRole('CONSULTANT')
      const result = await goldenTicketMiddleware({} as Request)
      expect(result.role).toBe('GOLDEN_TICKET')
    })
  })
}) 