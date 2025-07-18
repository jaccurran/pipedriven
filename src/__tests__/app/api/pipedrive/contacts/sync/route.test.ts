import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import app from '@/test-utils/testApp'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/pipedrive/contacts/sync/route'
import { createPipedriveService } from '@/server/services/pipedriveService'
import { OrganizationService } from '@/server/services/organizationService'

vi.mock('next-auth')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      // Add findFirst mock here
      findFirst: vi.fn().mockImplementation((args) => {
        if (args?.where?.pipedrivePersonId === '1') {
          return Promise.resolve(mockLocalContacts[0])
        }
        return Promise.resolve(undefined)
      }),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      update: vi.fn(),
    },
    syncHistory: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/server/services/pipedriveService', () => ({
  createPipedriveService: vi.fn(),
}))

vi.mock('@/server/services/organizationService', () => ({
  OrganizationService: {
    findOrCreateOrganization: vi.fn(),
  },
}))

// Mount the API route handler
app.mountAppRoute('/api/pipedrive/contacts/sync', POST)

const mockSession = {
  user: { 
    id: 'user-123', 
    email: 'test@example.com', 
    name: 'Test User',
    pipedriveApiKey: 'test-api-key'
  }
}

const mockPipedriveContacts = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: [{ value: 'alice@example.com', primary: true }],
    phone: [{ value: '+1234567890', primary: true }],
    org_id: {
      value: 1,
      name: 'Acme Corp',
      address: '123 Main St',
      people_count: 5,
      owner_id: 925477,
      active_flag: true,
      cc_email: 'acme@pipedrivemail.com',
      owner_name: 'John Curran'
    },
    org_name: 'Acme Corp',
    add_time: '2024-01-01T10:00:00Z',
    update_time: '2024-01-01T11:00:00Z',
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: [{ value: 'bob@example.com', primary: true }],
    phone: [],
    org_id: null,
    add_time: '2024-01-02T10:00:00Z',
    update_time: '2024-01-02T11:00:00Z',
  }
]

const mockPipedriveOrganizations = [
  {
    id: 1,
    name: 'Acme Corp',
    address: '123 Main St',
    country: 'United States',
    industry: 'Technology',
    size: '10-50',
    website: 'https://acme.com',
    city: 'San Francisco',
    add_time: '2024-01-01T09:00:00Z',
    update_time: '2024-01-01T10:00:00Z',
  }
]

const mockLocalContacts = [
  {
    id: 'contact-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    pipedrivePersonId: '1',
    pipedriveOrgId: '1',
    lastPipedriveUpdate: new Date('2024-01-01T10:00:00Z'),
    userId: 'user-123',
  }
]

let mockPipedriveService: any

describe('/api/pipedrive/contacts/sync endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    
    // Default mocks
    mockPipedriveService = {
      testConnection: vi.fn().mockResolvedValue({ success: true }),
      getPersons: vi.fn().mockResolvedValue({ success: true, persons: mockPipedriveContacts }),
      getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: mockPipedriveOrganizations }),
      getOrganizationDetails: vi.fn().mockResolvedValue({ 
        success: true, 
        organization: mockPipedriveOrganizations[0] 
      }),
    }
    vi.mocked(createPipedriveService).mockResolvedValue(mockPipedriveService)
    vi.mocked(prisma.contact.findMany).mockResolvedValue(mockLocalContacts)
    
    // Mock organization service
    vi.mocked(OrganizationService.findOrCreateOrganization).mockResolvedValue({
      id: 'org-1',
      name: 'Acme Corp',
      pipedriveOrgId: '1',
      address: '123 Main St',
      sector: 'Technology',
      country: 'United States',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.contact.count).mockResolvedValue(2)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockSession.user)
    vi.mocked(prisma.syncHistory.create).mockResolvedValue({
      id: 'sync-1',
      userId: 'user-123',
      syncType: 'INCREMENTAL',
      status: 'SUCCESS',
      startTime: new Date(),
      endTime: new Date(),
      contactsProcessed: 2,
      contactsUpdated: 1,
      contactsFailed: 0,
    })
    vi.mocked(prisma.syncHistory.update).mockResolvedValue({
      id: 'sync-1',
      userId: 'user-123',
      syncType: 'INCREMENTAL',
      status: 'SUCCESS',
      startTime: new Date(),
      endTime: new Date(),
      contactsProcessed: 2,
      contactsUpdated: 1,
      contactsFailed: 0,
    })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      // Provide a tx object with the same API as prisma.contact
      const tx = {
        contact: {
          findFirst: vi.fn().mockImplementation((args) => {
            // Return existing contact for pipedrivePersonId 1, undefined for others
            if (args?.where?.pipedrivePersonId === '1') {
              return Promise.resolve(mockLocalContacts[0])
            }
            // For all other pipedrivePersonIds, return undefined (contact doesn't exist)
            return Promise.resolve(undefined)
          }),
          update: vi.fn().mockImplementation(prisma.contact.update),
          create: vi.fn().mockImplementation(prisma.contact.create),
          count: vi.fn().mockImplementation(prisma.contact.count),
        },
        user: {
          update: vi.fn().mockImplementation(prisma.user.update),
        },
        organization: {
          update: vi.fn().mockImplementation(prisma.organization.update),
        },
        syncHistory: {
          create: vi.fn().mockImplementation(prisma.syncHistory.create),
          update: vi.fn().mockImplementation(prisma.syncHistory.update),
        },
      }
      return callback(tx)
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/auth/i)
    })

    it('should return 400 if user has no Pipedrive API key', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { ...mockSession.user, pipedriveApiKey: null }
      })
      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/pipedrive.*key/i)
    })
  })

  describe('Sync Types', () => {
    it('should perform full sync when no last sync timestamp', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockSession.user,
        lastSyncTimestamp: null
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.syncType).toBe('FULL')
      expect(mockPipedriveService.getPersons).toHaveBeenCalled()
    })

    it('should perform incremental sync when last sync timestamp exists', async () => {
      const lastSync = new Date('2024-01-01T10:00:00Z')
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockSession.user,
        lastSyncTimestamp: lastSync
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'INCREMENTAL', sinceTimestamp: '2024-01-01T10:00:00Z' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.syncType).toBe('INCREMENTAL')
      expect(mockPipedriveService.getPersons).toHaveBeenCalled()
    })
  })

  describe('Contact Processing', () => {
    it('should create new contacts that do not exist locally', async () => {
      const newContact = {
        id: 3,
        name: 'Charlie Brown',
        email: [{ value: 'charlie@example.com', primary: true }],
        phone: [],
        org_id: null,
        add_time: '2024-01-03T10:00:00Z',
        update_time: '2024-01-03T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [newContact] // Only the new contact
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.data.results.created).toBe(1)
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Charlie Brown',
            email: 'charlie@example.com',
            pipedrivePersonId: '3',
            userId: 'user-123'
          })
        })
      )
    })

    it('should update existing contacts that have changed', async () => {
      const updatedContact = {
        ...mockPipedriveContacts[0],
        name: 'Alice Johnson Updated',
        update_time: '2024-01-01T12:00:00Z'
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [updatedContact]
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.data.results.updated).toBe(1)
      expect(prisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-1' },
          data: expect.objectContaining({
            name: 'Alice Johnson Updated'
          })
        })
      )
    })

    it('should handle contacts with organizations', async () => {
      const contactWithOrg = {
        id: 3,
        name: 'Charlie Brown',
        email: [{ value: 'charlie@example.com', primary: true }],
        phone: [],
        org_id: {
          value: 2,
          name: 'Tech Solutions',
          address: '456 Tech Ave',
          people_count: 3,
          owner_id: 925477,
          active_flag: true,
          cc_email: 'tech@pipedrivemail.com',
          owner_name: 'John Curran'
        },
        org_name: 'Tech Solutions',
        add_time: '2024-01-03T10:00:00Z',
        update_time: '2024-01-03T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [contactWithOrg]
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(OrganizationService.findOrCreateOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tech Solutions',
          pipedriveOrgId: '2',
          address: '456 Tech Ave'
        })
      )
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pipedriveOrgId: '2',
            organizationId: 'org-1'
          })
        })
      )
    })

    it('should create organization and link contact when organization does not exist', async () => {
      const contactWithNewOrg = {
        id: 4,
        name: 'David Wilson',
        email: [{ value: 'david@newcompany.com', primary: true }],
        phone: [],
        org_id: {
          value: 3,
          name: 'New Company Ltd',
          address: '789 New St',
          people_count: 1,
          owner_id: 925477,
          active_flag: true,
          cc_email: 'new@pipedrivemail.com',
          owner_name: 'John Curran'
        },
        org_name: 'New Company Ltd',
        add_time: '2024-01-04T10:00:00Z',
        update_time: '2024-01-04T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [contactWithNewOrg]
      })

      // Mock that organization doesn't exist initially
      vi.mocked(OrganizationService.findOrCreateOrganization).mockResolvedValueOnce({
        id: 'org-2',
        name: 'New Company Ltd',
        pipedriveOrgId: '3',
        address: '789 New St',
        sector: 'Consulting',
        country: 'United Kingdom',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(OrganizationService.findOrCreateOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Company Ltd',
          pipedriveOrgId: '3',
          address: '789 New St'
        })
      )
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pipedriveOrgId: '3',
            organizationId: 'org-2'
          })
        })
      )
    })

    it('should fetch organization details from Pipedrive for new organizations', async () => {
      const contactWithNewOrg = {
        id: 5,
        name: 'Eve Johnson',
        email: [{ value: 'eve@startup.com', primary: true }],
        phone: [],
        org_id: {
          value: 4,
          name: 'Startup Inc',
          address: null,
          people_count: 2,
          owner_id: 925477,
          active_flag: true,
          cc_email: 'startup@pipedrivemail.com',
          owner_name: 'John Curran'
        },
        org_name: 'Startup Inc',
        add_time: '2024-01-05T10:00:00Z',
        update_time: '2024-01-05T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [contactWithNewOrg]
      })

      // Mock organization creation
      vi.mocked(OrganizationService.findOrCreateOrganization).mockResolvedValueOnce({
        id: 'org-3',
        name: 'Startup Inc',
        pipedriveOrgId: '4',
        address: null,
        sector: null,
        country: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Mock organization details from Pipedrive
      mockPipedriveService.getOrganizationDetails.mockResolvedValueOnce({
        success: true,
        organization: {
          id: 4,
          name: 'Startup Inc',
          address: '321 Startup Blvd',
          country: 'Canada',
          industry: 'Software',
          size: '2-10',
          website: 'https://startup.com',
          city: 'Toronto',
          add_time: '2024-01-05T09:00:00Z',
          update_time: '2024-01-05T10:00:00Z',
        }
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(mockPipedriveService.getOrganizationDetails).toHaveBeenCalledWith(4)
    })

    it('should handle organization API failures gracefully', async () => {
      const contactWithOrg = {
        id: 6,
        name: 'Frank Miller',
        email: [{ value: 'frank@company.com', primary: true }],
        phone: [],
        org_id: {
          value: 5,
          name: 'Company Corp',
          address: '123 Company St',
          people_count: 1,
          owner_id: 925477,
          active_flag: true,
          cc_email: 'company@pipedrivemail.com',
          owner_name: 'John Curran'
        },
        org_name: 'Company Corp',
        add_time: '2024-01-06T10:00:00Z',
        update_time: '2024-01-06T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [contactWithOrg]
      })

      // Mock organization creation succeeds but API call fails
      vi.mocked(OrganizationService.findOrCreateOrganization).mockResolvedValueOnce({
        id: 'org-4',
        name: 'Company Corp',
        pipedriveOrgId: '5',
        address: '123 Company St',
        sector: null,
        country: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPipedriveService.getOrganizationDetails.mockRejectedValueOnce(
        new Error('Rate limit exceeded')
      )

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.data.results.processed).toBe(1)
      // Contact should still be created even if organization details fetch fails
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pipedriveOrgId: '5',
            organizationId: 'org-4'
          })
        })
      )
    })

    it('should cache organizations to avoid duplicate API calls', async () => {
      const contactsWithSameOrg = [
        {
          id: 7,
          name: 'Grace Lee',
          email: [{ value: 'grace@shared.com', primary: true }],
          phone: [],
          org_id: {
            value: 6,
            name: 'Shared Organization',
            address: '456 Shared Ave',
            people_count: 3,
            owner_id: 925477,
            active_flag: true,
            cc_email: 'shared@pipedrivemail.com',
            owner_name: 'John Curran'
          },
          org_name: 'Shared Organization',
          add_time: '2024-01-07T10:00:00Z',
          update_time: '2024-01-07T11:00:00Z',
        },
        {
          id: 8,
          name: 'Henry Brown',
          email: [{ value: 'henry@shared.com', primary: true }],
          phone: [],
          org_id: {
            value: 6,
            name: 'Shared Organization',
            address: '456 Shared Ave',
            people_count: 3,
            owner_id: 925477,
            active_flag: true,
            cc_email: 'shared@pipedrivemail.com',
            owner_name: 'John Curran'
          },
          org_name: 'Shared Organization',
          add_time: '2024-01-08T10:00:00Z',
          update_time: '2024-01-08T11:00:00Z',
        }
      ]

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: contactsWithSameOrg
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      // Organization should only be created once, not twice
      expect(OrganizationService.findOrCreateOrganization).toHaveBeenCalledTimes(1)
      expect(OrganizationService.findOrCreateOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Shared Organization',
          pipedriveOrgId: '6'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle Pipedrive API connection failure', async () => {
      mockPipedriveService.testConnection.mockResolvedValue({ success: false, error: 'Connection failed' })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/connection.*failed/i)
    })

    it('should handle Pipedrive API errors', async () => {
      mockPipedriveService.getPersons.mockRejectedValue(new Error('API rate limit exceeded'))

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/sync.*failed/i)
    })

    it('should handle database transaction errors', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Database error'))

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/sync.*failed/i)
    })

    it('should handle partial sync failures gracefully', async () => {
      // Mock some contacts to fail processing
      vi.mocked(prisma.contact.create).mockRejectedValueOnce(new Error('Validation error'))

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.data.results.failed).toBeGreaterThan(0)
      expect(res.body.data.results.processed).toBeGreaterThan(res.body.data.results.failed)
    })
  })

  describe('Sync Statistics', () => {
    it('should return accurate sync statistics', async () => {
      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        syncType: expect.any(String),
        results: expect.any(Object),
        syncDuration: expect.any(Number),
        lastSyncTimestamp: expect.any(String)
      })
    })

    it('should update user last sync timestamp', async () => {
      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastSyncTimestamp: expect.any(Date) }
      })
    })

    it('should create sync history record', async () => {
      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(prisma.syncHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          syncType: expect.any(String),
          status: 'PENDING',
          totalContacts: expect.any(Number),
          contactsProcessed: 0,
          contactsUpdated: 0,
          contactsCreated: 0,
          contactsFailed: 0,
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty Pipedrive response', async () => {
      mockPipedriveService.getPersons.mockResolvedValue({ success: true, persons: [] })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.data.results.processed).toBe(0)
      expect(res.body.data.results.created).toBe(0)
    })

    it('should handle contacts with missing email', async () => {
      const contactWithoutEmail = {
        id: 3,
        name: 'Charlie Brown',
        email: [],
        phone: [],
        org_id: null,
        add_time: '2024-01-03T10:00:00Z',
        update_time: '2024-01-03T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [contactWithoutEmail]
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: null
          })
        })
      )
    })

    it('should handle contacts with multiple email addresses', async () => {
      const contactWithMultipleEmails = {
        id: 3,
        name: 'Charlie Brown',
        email: [
          { value: 'alice@example.com', primary: false },
          { value: 'alice.primary@example.com', primary: true }
        ],
        phone: [],
        org_id: null,
        add_time: '2024-01-03T10:00:00Z',
        update_time: '2024-01-03T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [contactWithMultipleEmails]
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'alice.primary@example.com'
          })
        })
      )
    })

    it('should handle large contact lists efficiently', async () => {
      const manyContacts = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Contact ${i + 1}`,
        email: [{ value: `contact${i + 1}@example.com`, primary: true }],
        phone: [],
        org_id: null,
        add_time: '2024-01-01T10:00:00Z',
        update_time: '2024-01-01T11:00:00Z',
      }))

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: manyContacts
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')
        .send({ syncType: 'FULL' })

      expect(res.status).toBe(200)
      expect(res.body.data.results.processed).toBe(100)
      expect(res.body.data.results.created).toBe(99) // One contact (id: 1) already exists
    })
  })
}) 