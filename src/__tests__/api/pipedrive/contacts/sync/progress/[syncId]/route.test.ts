import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/pipedrive/contacts/sync/progress/[syncId]/route'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    syncHistory: {
      findUnique: vi.fn(),
    },
  },
}))

// Import mocked modules
const mockGetServerSession = vi.mocked(getServerSession)
const mockPrisma = vi.mocked(prisma)

describe('/api/pipedrive/contacts/sync/progress/[syncId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any)
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should return 401 when session has no user ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' }, // No ID
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Sync ID Validation', () => {
    it('should return 400 when syncId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/')

      const response = await GET(request, { params: {} })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Sync ID is required')
    })

    it('should return 400 when syncId is invalid format', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/invalid$id')

      const response = await GET(request, { params: { syncId: 'invalid$id' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid sync ID format')
    })

    it('should accept valid sync ID format', async () => {
      mockPrisma.syncHistory.findUnique.mockResolvedValue({
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'PENDING',
        startTime: new Date(),
        contactsProcessed: 25,
        contactsUpdated: 20,
        contactsCreated: 5,
        contactsFailed: 0,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })
  })

  describe('Sync Progress Retrieval', () => {
    it('should return 404 when sync progress is not found', async () => {
      mockPrisma.syncHistory.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Sync not found')
    })

    it('should return current progress when sync is found', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'PENDING',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        duration: null,
        contactsProcessed: 50,
        contactsUpdated: 40,
        contactsCreated: 10,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      
      const text = await response.text()
      expect(text).toContain('event: progress')
      expect(text).toContain('"syncId":"sync-123"')
      expect(text).toContain('"processedContacts":50')
      expect(text).toContain('"status":"processing"')
    })

    it('should return completed progress when sync is finished', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'SUCCESS',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        duration: 300000, // 5 minutes
        contactsProcessed: 100,
        contactsUpdated: 80,
        contactsCreated: 20,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      
      const text = await response.text()
      expect(text).toContain('event: complete')
      expect(text).toContain('"status":"completed"')
      expect(text).toContain('"processedContacts":100')
    })

    it('should return failed progress when sync failed', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'FAILED',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:02:00Z'),
        duration: 120000, // 2 minutes
        contactsProcessed: 25,
        contactsUpdated: 20,
        contactsCreated: 5,
        contactsFailed: 0,
        error: 'API connection failed',
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      
      const text = await response.text()
      expect(text).toContain('event: error')
      expect(text).toContain('"status":"failed"')
      expect(text).toContain('"error":"API connection failed"')
    })
  })

  describe('Server-Sent Events Format', () => {
    it('should return properly formatted SSE response', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'PENDING',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        duration: null,
        contactsProcessed: 25,
        contactsUpdated: 20,
        contactsCreated: 5,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should include progress event in response body', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'PENDING',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        duration: null,
        contactsProcessed: 25,
        contactsUpdated: 20,
        contactsCreated: 5,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      const text = await response.text()
      expect(text).toContain('event: progress')
      expect(text).toContain('data: ')
      expect(text).toContain('"syncId":"sync-123"')
      expect(text).toContain('"processedContacts":25')
      expect(text).toContain('"status":"processing"')
    })

    it('should calculate percentage correctly', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'PENDING',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        duration: null,
        contactsProcessed: 50,
        contactsUpdated: 40,
        contactsCreated: 10,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      const text = await response.text()
      expect(text).toContain('"percentage":50')
    })

    it('should handle 100% completion', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'SUCCESS',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        duration: 300000,
        contactsProcessed: 100,
        contactsUpdated: 80,
        contactsCreated: 20,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      const text = await response.text()
      expect(text).toContain('"percentage":100')
      expect(text).toContain('event: complete')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.syncHistory.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve sync progress')
    })

    it('should handle invalid sync ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/')

      const response = await GET(request, { params: {} })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Sync ID is required')
    })
  })

  describe('Progress Calculation', () => {
    it('should calculate progress for processing status', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'PENDING',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        duration: null,
        contactsProcessed: 75,
        contactsUpdated: 60,
        contactsCreated: 15,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      const text = await response.text()
      expect(text).toContain('"percentage":75')
      expect(text).toContain('"status":"processing"')
    })

    it('should handle zero contacts processed', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'FULL',
        status: 'PENDING',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        duration: null,
        contactsProcessed: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        contactsFailed: 0,
      }
      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockSyncHistory as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      const text = await response.text()
      expect(text).toContain('"percentage":0')
      expect(text).toContain('"processedContacts":0')
    })
  })
}) 