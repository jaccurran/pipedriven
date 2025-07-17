import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pipedrive/contacts/sync/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'

// Mock dependencies with complete strategy
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    syncHistory: {
      create: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock Pipedrive service with proper structure
vi.mock('@/server/services/pipedriveService', () => ({
  createPipedriveService: vi.fn(),
}))

// Import mocked modules
const mockPrisma = vi.mocked(prisma)
const mockGetServerSession = vi.mocked(getServerSession)
const mockCreatePipedriveService = vi.mocked(await import('@/server/services/pipedriveService')).createPipedriveService

// Test data factories
const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  pipedriveApiKey: 'test-api-key-1234567890abcdef',
  lastSyncTimestamp: new Date('2024-01-01T00:00:00Z'),
  syncStatus: 'SYNCED',
  ...overrides,
})

const createMockPipedriveContact = (overrides = {}) => ({
  id: 12345,
  name: 'John Doe',
  email: [{ value: 'john@example.com', primary: true }],
  phone: [{ value: '+1234567890', primary: true }],
  org_id: 67890,
  org_name: 'Tech Corp',
  title: 'Software Engineer',
  updated: '2024-01-15T10:00:00Z',
  last_activity_date: '2024-01-14T15:30:00Z',
  ...overrides,
})

const createMockSyncHistory = (overrides = {}) => ({
  id: 'sync-123',
  userId: 'user-123',
  syncType: 'INCREMENTAL',
  contactsProcessed: 25,
  contactsUpdated: 20,
  contactsCreated: 5,
  contactsFailed: 0,
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T10:01:00Z'),
  status: 'SUCCESS',
  error: null,
  ...overrides,
})

const createMockContact = (overrides = {}) => ({
  id: 'contact-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  organisation: 'Tech Corp',
  warmnessScore: 5,
  lastContacted: new Date('2024-01-14T15:30:00Z'),
  addedToCampaign: false,
  pipedrivePersonId: '12345',
  pipedriveOrgId: '67890',
  syncStatus: 'SYNCED',
  lastPipedriveUpdate: new Date('2024-01-15T10:00:00Z'),
  userId: 'user-123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
})

describe('/api/pipedrive/contacts/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any)
    
    // Default user mock
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser())
    
    // Default sync history mock
    mockPrisma.syncHistory.create.mockResolvedValue(createMockSyncHistory())
    
    // Default contact mock
    mockPrisma.contact.findFirst.mockResolvedValue(null)
    mockPrisma.contact.create.mockResolvedValue(createMockContact())
    mockPrisma.contact.update.mockResolvedValue(createMockContact())
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 401 when session has no user ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' }, // No ID
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Request Validation', () => {
    it('should return 400 when syncType is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('syncType')
    })

    it('should return 400 when syncType is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'INVALID' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('syncType')
    })

    it('should return 400 when sinceTimestamp is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ 
          syncType: 'INCREMENTAL',
          sinceTimestamp: 'invalid-date'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('sinceTimestamp')
    })

    it('should accept valid request with all optional fields', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ success: true, persons: [] }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)
      // Set up user with valid lastSyncTimestamp and syncStatus 'COMPLETED'
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({
        lastSyncTimestamp: new Date('2024-01-01T00:00:00Z'),
        syncStatus: 'COMPLETED',
      }))
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({
          syncType: 'INCREMENTAL',
          sinceTimestamp: '2024-01-01T00:00:00Z',
          contactIds: ['12345'],
          force: false,
          enableProgress: true,
          batchSize: 10,
        }),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.syncType).toBe('INCREMENTAL')
    })
  })

  describe('User Validation', () => {
    it('should return 404 when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 400 when user has no Pipedrive API key', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ pipedriveApiKey: null }))

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Pipedrive API key is required')
    })
  })

  describe('Pipedrive Connection', () => {
    it('should return 400 when Pipedrive connection fails', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ 
          success: false, 
          error: 'Invalid API key' 
        }),
        getPersons: vi.fn(),
        getOrganizations: vi.fn(),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Pipedrive API key is invalid or expired')
    })
  })

  describe('Sync Operations', () => {
    it('should perform full sync successfully', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ 
          success: true, 
          persons: [
            createMockPipedriveContact(),
            createMockPipedriveContact({ id: 12346, name: 'Jane Smith' }),
          ] 
        }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.syncType).toBe('FULL')
      expect(data.data.results.total).toBe(2)
      expect(data.data.results.processed).toBe(2)
      expect(data.data.results.created).toBe(2)
      expect(data.data.results.failed).toBe(0)
    })

    it('should perform incremental sync successfully', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ 
          success: true, 
          persons: [
            createMockPipedriveContact({ updated: '2024-01-15T11:00:00Z' }),
          ] 
        }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ 
          syncType: 'INCREMENTAL',
          sinceTimestamp: '2024-01-15T10:00:00Z'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.syncType).toBe('INCREMENTAL')
      expect(data.data.results.total).toBe(1)
      expect(data.data.results.created).toBe(1)
    })

    it('should handle sync with no changes', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue([]),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ 
          syncType: 'INCREMENTAL',
          sinceTimestamp: '2024-01-01T00:00:00Z'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results.total).toBe(0)
      expect(data.data.results.processed).toBe(0)
      expect(data.data.results.updated).toBe(0)
      expect(data.data.results.created).toBe(0)
      expect(data.data.results.failed).toBe(0)
    })
  })

  describe('Sync History Tracking', () => {
    it('should create sync history record', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ 
          success: true, 
          persons: [createMockPipedriveContact()] 
        }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      await POST(request)

      expect(mockPrisma.syncHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          syncType: 'FULL',
          status: 'PENDING',
          startTime: expect.any(Date),
        }),
      })
    })

    it('should update sync history on completion', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ 
          success: true, 
          persons: [createMockPipedriveContact()] 
        }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      await POST(request)

      expect(mockPrisma.syncHistory.update).toHaveBeenCalledWith({
        where: { id: 'sync-123' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          endTime: expect.any(Date),
          duration: expect.any(Number),
          contactsProcessed: 1,
          contactsCreated: 1,
        }),
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle Pipedrive API errors gracefully', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ 
          success: false, 
          error: 'Pipedrive API error' 
        }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Pipedrive API error')
    })

    it('should update sync history on error', async () => {
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ 
          success: false, 
          error: 'Pipedrive API error' 
        }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' }),
      })

      try {
        await POST(request)
      } catch (error) {
        // Expected to fail
      }

      expect(mockPrisma.syncHistory.update).toHaveBeenCalledWith({
        where: { id: 'sync-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Pipedrive API error',
          endTime: expect.any(Date),
        }),
      })
    })
  })

  describe('Performance Tracking', () => {
    it('should include performance metrics in response', async () => {
      // Properly mock createPipedriveService for this test
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue([{ id: '1', name: 'Test', email: [], phone: [] }]),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('duration');
      expect(typeof data.data.duration).toBe('number');
      expect(data.data.duration).toBeGreaterThanOrEqual(0); // Allow 0 in test environment
    });
  })

  describe('Progress Updates', () => {
    it('should update SyncHistory.contactsProcessed after each batch', async () => {
      // Arrange: simulate 3 batches of 50 contacts each
      const totalContacts = 150
      const batchSize = 50
      const mockContacts = Array.from({ length: totalContacts }, (_, i) => createMockPipedriveContact({ id: i + 1, name: `Contact ${i + 1}` }))
      const mockPipedriveService = {
        testConnection: vi.fn().mockResolvedValue({ success: true }),
        getPersons: vi.fn().mockResolvedValue({ success: true, persons: mockContacts }),
        getOrganizations: vi.fn().mockResolvedValue({ success: true, organizations: [] }),
      }
      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService)
      mockPrisma.syncHistory.create.mockResolvedValue(createMockSyncHistory({ contactsProcessed: 0 }))
      mockPrisma.syncHistory.update.mockResolvedValue(createMockSyncHistory())
      mockPrisma.contact.findFirst.mockResolvedValue(null)
      mockPrisma.contact.create.mockResolvedValue(createMockContact())
      mockPrisma.contact.update.mockResolvedValue(createMockContact())

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'FULL', batchSize }),
      })

      // Act
      await POST(request)

      // Assert: should update contactsProcessed after each batch
      // There should be 3 updates (after each batch)
      const updateCalls = mockPrisma.syncHistory.update.mock.calls.filter(call => call[0]?.data?.contactsProcessed !== undefined)
      expect(updateCalls.length).toBeGreaterThanOrEqual(3)
      expect(updateCalls[0][0].data.contactsProcessed).toBe(50)
      expect(updateCalls[1][0].data.contactsProcessed).toBe(100)
      expect(updateCalls[2][0].data.contactsProcessed).toBe(150)
    })
  })
}) 