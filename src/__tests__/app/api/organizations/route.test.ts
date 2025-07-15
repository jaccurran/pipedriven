import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/organizations/route'
import { OrganizationService } from '@/server/services/organizationService'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/server/services/organizationService', () => ({
  OrganizationService: {
    getOrganizationsForUser: vi.fn(),
    findOrCreateOrganization: vi.fn()
  }
}))

const mockGetServerSession = vi.mocked(await import('next-auth')).getServerSession
const mockOrganizationService = vi.mocked(OrganizationService)

describe('/api/organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return organizations for authenticated user', async () => {
      // Arrange
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockOrganizations = {
        organizations: [
          {
            id: 'org-1',
            name: 'Acme Corp',
            normalizedName: 'acme corp',
            contactCount: 5
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      }
      mockOrganizationService.getOrganizationsForUser.mockResolvedValue(mockOrganizations)

      const request = new NextRequest('http://localhost:3000/api/organizations?page=1&limit=20')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrganizations)
      expect(mockOrganizationService.getOrganizationsForUser).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 20,
        search: ''
      })
    })

    it('should handle search parameter', async () => {
      // Arrange
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockOrganizations = {
        organizations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      }
      mockOrganizationService.getOrganizationsForUser.mockResolvedValue(mockOrganizations)

      const request = new NextRequest('http://localhost:3000/api/organizations?search=acme')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(mockOrganizationService.getOrganizationsForUser).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 20,
        search: 'acme'
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/organizations')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle service errors', async () => {
      // Arrange
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockOrganizationService.getOrganizationsForUser.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/organizations')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch organizations')
    })
  })

  describe('POST', () => {
    it('should create organization for authenticated user', async () => {
      // Arrange
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const organizationData = {
        name: 'New Corp',
        industry: 'Technology'
      }

      const mockOrganization = {
        id: 'org-2',
        name: 'New Corp',
        normalizedName: 'new corp',
        industry: 'Technology',
        contactCount: 0
      }
      mockOrganizationService.findOrCreateOrganization.mockResolvedValue(mockOrganization)

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrganization)
      expect(mockOrganizationService.findOrCreateOrganization).toHaveBeenCalledWith(organizationData)
    })

    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Corp' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle service errors', async () => {
      // Arrange
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockOrganizationService.findOrCreateOrganization.mockRejectedValue(new Error('Validation error'))

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Corp' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create organization')
    })
  })
}) 