// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    contact: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    activity: {
      findFirst: vi.fn(),
    },
  },
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { OrganizationService } from '@/server/services/organizationService'

const mockPrisma = vi.mocked(prisma)

describe('OrganizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findOrCreateOrganization', () => {
    it('should create new organization when none exists', async () => {
      // Arrange
      const orgData = {
        name: 'Acme Corporation',
        pipedriveOrgId: '123',
        industry: 'Technology',
        size: '50-100',
        website: 'https://acme.com',
        address: '123 Main St',
        country: 'USA',
        city: 'San Francisco',
      }

      mockPrisma.organization.findFirst.mockResolvedValue(null)
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corporation',
        normalizedName: 'acme corporation',
        pipedriveOrgId: '123',
        industry: 'Technology',
        size: '50-100',
        website: 'https://acme.com',
        address: '123 Main St',
        country: 'USA',
        city: 'San Francisco',
        contactCount: 0,
        lastActivity: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await OrganizationService.findOrCreateOrganization(orgData)

      // Assert
      expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { pipedriveOrgId: '123' },
            { normalizedName: 'acme corporation' }
          ]
        }
      })
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Acme Corporation',
          normalizedName: 'acme corporation',
          pipedriveOrgId: '123',
          industry: 'Technology',
          size: '50-100',
          website: 'https://acme.com',
          address: '123 Main St',
          country: 'USA',
          city: 'San Francisco',
        }
      })
      expect(result.name).toBe('Acme Corporation')
      expect(result.normalizedName).toBe('acme corporation')
    })

    it('should find existing organization by Pipedrive ID', async () => {
      // Arrange
      const orgData = {
        name: 'Acme Corporation',
        pipedriveOrgId: '123',
      }

      const existingOrg = {
        id: 'org-1',
        name: 'Acme Corporation',
        normalizedName: 'acme corporation',
        pipedriveOrgId: '123',
        industry: 'Technology',
        size: null,
        website: null,
        address: null,
        country: null,
        city: null,
        contactCount: 5,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.organization.findFirst.mockResolvedValue(existingOrg)

      // Act
      const result = await OrganizationService.findOrCreateOrganization(orgData)

      // Assert
      expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { pipedriveOrgId: '123' },
            { normalizedName: 'acme corporation' }
          ]
        }
      })
      expect(mockPrisma.organization.create).not.toHaveBeenCalled()
      expect(result).toBe(existingOrg)
    })

    it('should update organization with Pipedrive ID if missing', async () => {
      // Arrange
      const orgData = {
        name: 'Acme Corp',
        pipedriveOrgId: '123',
      }

      const existingOrg = {
        id: 'org-1',
        name: 'Acme Corp',
        normalizedName: 'acme corp',
        pipedriveOrgId: null,
        industry: null,
        size: null,
        website: null,
        address: null,
        country: null,
        city: null,
        contactCount: 2,
        lastActivity: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedOrg = { ...existingOrg, pipedriveOrgId: '123' }

      mockPrisma.organization.findFirst.mockResolvedValue(existingOrg)
      mockPrisma.organization.update.mockResolvedValue(updatedOrg)

      // Act
      const result = await OrganizationService.findOrCreateOrganization(orgData)

      // Assert
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { pipedriveOrgId: '123' }
      })
      expect(result.pipedriveOrgId).toBe('123')
    })
  })

  describe('normalizeOrganizationName', () => {
    it('should normalize organization names correctly', () => {
      const testCases = [
        { input: 'Acme Corp.', expected: 'acme corp' },
        { input: 'ACME CORPORATION', expected: 'acme corporation' },
        { input: 'Acme Corp Ltd.', expected: 'acme corp ltd' },
        { input: 'Acme-Corp', expected: 'acme corp' },
        { input: 'Acme & Associates', expected: 'acme associates' },
        { input: '  Acme Corp  ', expected: 'acme corp' },
        { input: 'Acme Corp, Inc.', expected: 'acme corp inc' },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = OrganizationService.normalizeOrganizationName(input)
        expect(result).toBe(expected)
      })
    })

    it('should handle empty and null names', () => {
      expect(OrganizationService.normalizeOrganizationName('')).toBe('')
      expect(OrganizationService.normalizeOrganizationName('   ')).toBe('')
    })
  })

  describe('updateOrganizationStats', () => {
    it('should update organization contact count and last activity', async () => {
      // Arrange
      const organizationId = 'org-1'
      const contactCount = 5
      const lastActivity = new Date('2024-01-15T10:30:00Z')

      mockPrisma.contact.count.mockResolvedValue(contactCount)
      mockPrisma.activity.findFirst.mockResolvedValue({
        createdAt: lastActivity,
      })

      // Act
      await OrganizationService.updateOrganizationStats(organizationId)

      // Assert
      expect(mockPrisma.contact.count).toHaveBeenCalledWith({
        where: { organizationId }
      })
      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith({
        where: {
          contact: { organizationId }
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: organizationId },
        data: {
          contactCount,
          lastActivity
        }
      })
    })

    it('should handle organization with no contacts', async () => {
      // Arrange
      const organizationId = 'org-1'

      mockPrisma.contact.count.mockResolvedValue(0)
      mockPrisma.activity.findFirst.mockResolvedValue(null)

      // Act
      await OrganizationService.updateOrganizationStats(organizationId)

      // Assert
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: organizationId },
        data: {
          contactCount: 0,
          lastActivity: null
        }
      })
    })
  })

  describe('findOrganizationMatch', () => {
    it('should find organization by exact normalized name match', async () => {
      // Arrange
      const orgName = 'Acme Corporation'
      const existingOrg = {
        id: 'org-1',
        name: 'Acme Corp',
        normalizedName: 'acme corporation',
        pipedriveOrgId: '123',
        industry: null,
        size: null,
        website: null,
        address: null,
        country: null,
        city: null,
        contactCount: 3,
        lastActivity: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.organization.findFirst.mockResolvedValue(existingOrg)

      // Act
      const result = await OrganizationService.findOrganizationMatch(orgName)

      // Assert
      expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: { normalizedName: 'acme corporation' }
      })
      expect(result).toBe(existingOrg)
    })

    it('should return null when no match found', async () => {
      // Arrange
      const orgName = 'Unknown Corp'
      mockPrisma.organization.findFirst.mockResolvedValue(null)

      // Act
      const result = await OrganizationService.findOrganizationMatch(orgName)

      // Assert
      expect(result).toBeNull()
    })
  })
}) 