import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/organizations/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' }
    } as any)
  })

  describe('GET /api/organizations', () => {
    it('should return 401 when user is not authenticated', async () => {
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

    it('should return organizations for authenticated user', async () => {
      // Arrange
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Acme Corp',
          normalizedName: 'acme corp',
          pipedriveOrgId: '123',
          industry: 'Technology',
          size: '50-100',
          website: 'https://acme.com',
          address: '123 Main St',
          country: 'USA',
          city: 'San Francisco',
          contactCount: 5,
          lastActivity: new Date('2024-01-15T10:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { contacts: 5 }
        },
        {
          id: 'org-2',
          name: 'Tech Solutions',
          normalizedName: 'tech solutions',
          pipedriveOrgId: '456',
          industry: 'Software',
          size: '10-50',
          website: 'https://techsolutions.com',
          address: null,
          country: null,
          city: null,
          contactCount: 3,
          lastActivity: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { contacts: 3 }
        }
      ]

      mockPrisma.organization.findMany.mockResolvedValue(mockOrganizations)
      mockPrisma.organization.count.mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/organizations')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.organizations).toHaveLength(2)
      expect(data.data.organizations[0].name).toBe('Acme Corp')
      expect(data.data.organizations[1].name).toBe('Tech Solutions')
      expect(data.data.pagination.total).toBe(2)
    })

    it('should handle pagination correctly', async () => {
      // Arrange
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Acme Corp',
          normalizedName: 'acme corp',
          pipedriveOrgId: '123',
          industry: null,
          size: null,
          website: null,
          address: null,
          country: null,
          city: null,
          contactCount: 5,
          lastActivity: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { contacts: 5 }
        }
      ]

      mockPrisma.organization.findMany.mockResolvedValue(mockOrganizations)
      mockPrisma.organization.count.mockResolvedValue(15)

      const request = new NextRequest('http://localhost:3000/api/organizations?page=2&limit=10')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data.pagination.page).toBe(2)
      expect(data.data.pagination.limit).toBe(10)
      expect(data.data.pagination.total).toBe(15)
      expect(data.data.pagination.totalPages).toBe(2)
      expect(data.data.pagination.hasNext).toBe(false)
      expect(data.data.pagination.hasPrev).toBe(true)
    })

    it('should handle search filtering', async () => {
      // Arrange
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Acme Corp',
          normalizedName: 'acme corp',
          pipedriveOrgId: '123',
          industry: null,
          size: null,
          website: null,
          address: null,
          country: null,
          city: null,
          contactCount: 5,
          lastActivity: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { contacts: 5 }
        }
      ]

      mockPrisma.organization.findMany.mockResolvedValue(mockOrganizations)
      mockPrisma.organization.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/organizations?search=acme')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data.organizations).toHaveLength(1)
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          contacts: {
            some: { userId: 'user-1' }
          },
          OR: [
            { name: { contains: 'acme', mode: 'insensitive' } },
            { normalizedName: { contains: 'acme' } }
          ]
        },
        include: {
          _count: {
            select: { contacts: true }
          }
        },
        orderBy: { contactCount: 'desc' },
        skip: 0,
        take: 20
      })
    })

    it('should handle empty results', async () => {
      // Arrange
      mockPrisma.organization.findMany.mockResolvedValue([])
      mockPrisma.organization.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/organizations')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.organizations).toHaveLength(0)
      expect(data.data.pagination.total).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.organization.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/organizations')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch organizations')
    })
  })

  describe('POST /api/organizations', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)
      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org' })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create new organization successfully', async () => {
      // Arrange
      const orgData = {
        name: 'New Organization',
        industry: 'Technology',
        size: '10-50',
        website: 'https://neworg.com',
        address: '456 Oak St',
        country: 'USA',
        city: 'New York'
      }

      const createdOrg = {
        id: 'org-new',
        name: 'New Organization',
        normalizedName: 'new organization',
        pipedriveOrgId: null,
        industry: 'Technology',
        size: '10-50',
        website: 'https://neworg.com',
        address: '456 Oak St',
        country: 'USA',
        city: 'New York',
        contactCount: 0,
        lastActivity: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.organization.create.mockResolvedValue(createdOrg)

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData)
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('New Organization')
      expect(data.data.normalizedName).toBe('new organization')
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'New Organization',
          normalizedName: 'new organization',
          industry: 'Technology',
          size: '10-50',
          website: 'https://neworg.com',
          address: '456 Oak St',
          country: 'USA',
          city: 'New York'
        }
      })
    })

    it('should handle invalid request body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/organizations', {
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

    it('should handle missing required fields', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ industry: 'Technology' }) // Missing name
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed')
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.organization.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org' })
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