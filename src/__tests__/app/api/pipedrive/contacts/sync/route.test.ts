import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import app from '@/test-utils/testApp'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/pipedrive/contacts/sync/route'
import { createPipedriveService } from '@/server/services/pipedriveService'

vi.mock('next-auth')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    syncHistory: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/server/services/pipedriveService', () => ({
  createPipedriveService: vi.fn(),
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
    org_id: 1,
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
    }
    vi.mocked(createPipedriveService).mockResolvedValue(mockPipedriveService)
    vi.mocked(prisma.contact.findMany).mockResolvedValue(mockLocalContacts)
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
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      // Provide a tx object with the same API as prisma.contact
      const tx = {
        contact: {
          findFirst: vi.fn().mockImplementation((args) => {
            // Return existing contact for pipedrivePersonId 1, undefined for others
            if (args?.where?.pipedrivePersonId === '1') {
              return Promise.resolve(mockLocalContacts[0])
            }
            return Promise.resolve(undefined)
          }),
          update: vi.fn().mockImplementation(prisma.contact.update),
          create: vi.fn().mockImplementation(prisma.contact.create),
        },
        user: {
          update: vi.fn().mockImplementation(prisma.user.update),
        },
        syncHistory: {
          create: vi.fn().mockImplementation(prisma.syncHistory.create),
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
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/auth/i)
    })

    it('should return 400 if user has no Pipedrive API key', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { ...mockSession.user, pipedriveApiKey: null }
      })
      const res = await request(app).post('/api/pipedrive/contacts/sync')
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

      expect(res.status).toBe(200)
      expect(res.body.data.contactsCreated).toBe(1)
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

      expect(res.status).toBe(200)
      expect(res.body.data.contactsUpdated).toBe(1)
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
        org_id: 1,
        add_time: '2024-01-03T10:00:00Z',
        update_time: '2024-01-03T11:00:00Z',
      }

      mockPipedriveService.getPersons.mockResolvedValue({
        success: true,
        persons: [contactWithOrg]
      })

      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(200)
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pipedriveOrgId: '1'
          })
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle Pipedrive API connection failure', async () => {
      mockPipedriveService.testConnection.mockResolvedValue({ success: false, error: 'Connection failed' })

      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/connection.*failed/i)
    })

    it('should handle Pipedrive API errors', async () => {
      mockPipedriveService.getPersons.mockRejectedValue(new Error('API rate limit exceeded'))

      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/sync.*failed/i)
    })

    it('should handle database transaction errors', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Database error'))

      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/sync.*failed/i)
    })

    it('should handle partial sync failures gracefully', async () => {
      // Mock some contacts to fail processing
      vi.mocked(prisma.contact.create).mockRejectedValueOnce(new Error('Validation error'))

      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(200)
      expect(res.body.data.contactsFailed).toBeGreaterThan(0)
      expect(res.body.data.contactsProcessed).toBeGreaterThan(res.body.data.contactsFailed)
    })
  })

  describe('Sync Statistics', () => {
    it('should return accurate sync statistics', async () => {
      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        syncType: expect.any(String),
        contactsProcessed: expect.any(Number),
        contactsCreated: expect.any(Number),
        contactsUpdated: expect.any(Number),
        contactsFailed: expect.any(Number),
        syncDuration: expect.any(Number),
        lastSyncTimestamp: expect.any(String)
      })
    })

    it('should update user last sync timestamp', async () => {
      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastSyncTimestamp: expect.any(Date) }
      })
    })

    it('should create sync history record', async () => {
      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(200)
      expect(prisma.syncHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          syncType: expect.any(String),
          status: 'SUCCESS',
          contactsProcessed: expect.any(Number),
          contactsUpdated: expect.any(Number),
          contactsFailed: expect.any(Number)
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty Pipedrive response', async () => {
      mockPipedriveService.getPersons.mockResolvedValue({ success: true, persons: [] })

      const res = await request(app).post('/api/pipedrive/contacts/sync')

      expect(res.status).toBe(200)
      expect(res.body.data.contactsProcessed).toBe(0)
      expect(res.body.data.contactsCreated).toBe(0)
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

      expect(res.status).toBe(200)
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

      expect(res.status).toBe(200)
      expect(res.body.data.contactsProcessed).toBe(100)
      expect(res.body.data.contactsCreated).toBe(99) // One contact (id: 1) already exists
    })
  })
}) 