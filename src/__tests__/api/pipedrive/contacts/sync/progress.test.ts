import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/pipedrive/contacts/sync/progress/[syncId]/route'
import { getServerSession } from '@/lib/auth'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock sync progress store
vi.mock('@/lib/syncProgressStore', () => ({
  getSyncProgress: vi.fn(),
  subscribeToProgress: vi.fn(),
}))

// Import mocked modules
const mockGetServerSession = vi.mocked(getServerSession)
const mockGetSyncProgress = vi.mocked(await import('@/lib/syncProgressStore')).getSyncProgress
const mockSubscribeToProgress = vi.mocked(await import('@/lib/syncProgressStore')).subscribeToProgress

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
    })

    it('should return 401 when session has no user ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' }, // No ID
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(401)
    })
  })

  describe('Sync ID Validation', () => {
    it('should return 400 when syncId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/')

      const response = await GET(request, { params: {} })

      expect(response.status).toBe(400)
    })

    it('should return 400 when syncId is invalid format', async () => {
      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/invalid-id')

      const response = await GET(request, { params: { syncId: 'invalid-id' } })

      expect(response.status).toBe(400)
    })

    it('should accept valid sync ID format', async () => {
      mockGetSyncProgress.mockResolvedValue({
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 25,
        currentContact: 'John Doe',
        percentage: 25,
        status: 'processing',
        errors: [],
        batchNumber: 1,
        totalBatches: 4,
      })

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
      mockGetSyncProgress.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(404)
    })

    it('should return current progress when sync is found', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 50,
        currentContact: 'Jane Smith',
        percentage: 50,
        status: 'processing',
        errors: [],
        batchNumber: 2,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should return completed progress when sync is finished', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 100,
        currentContact: '',
        percentage: 100,
        status: 'completed',
        errors: [],
        batchNumber: 4,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
    })

    it('should return failed progress when sync failed', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 25,
        currentContact: '',
        percentage: 25,
        status: 'failed',
        errors: ['API connection failed'],
        batchNumber: 1,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
    })

    it('should return cancelled progress when sync was cancelled', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 50,
        currentContact: '',
        percentage: 50,
        status: 'cancelled',
        errors: [],
        batchNumber: 2,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
    })
  })

  describe('Server-Sent Events Format', () => {
    it('should return properly formatted SSE response', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 25,
        currentContact: 'John Doe',
        percentage: 25,
        status: 'processing',
        errors: [],
        batchNumber: 1,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should include progress event in response body', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 25,
        currentContact: 'John Doe',
        percentage: 25,
        status: 'processing',
        errors: [],
        batchNumber: 1,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })
      const text = await response.text()

      expect(text).toContain('event: progress')
      expect(text).toContain('"syncId":"sync-123"')
      expect(text).toContain('"totalContacts":100')
      expect(text).toContain('"processedContacts":25')
      expect(text).toContain('"currentContact":"John Doe"')
      expect(text).toContain('"percentage":25')
      expect(text).toContain('"status":"processing"')
      expect(text).toContain('"batchNumber":1')
      expect(text).toContain('"totalBatches":4')
    })

    it('should include complete event when sync is finished', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 100,
        currentContact: '',
        percentage: 100,
        status: 'completed',
        errors: [],
        batchNumber: 4,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })
      const text = await response.text()

      expect(text).toContain('event: complete')
      expect(text).toContain('"status":"completed"')
      expect(text).toContain('"percentage":100')
    })

    it('should include error event when sync failed', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 25,
        currentContact: '',
        percentage: 25,
        status: 'failed',
        errors: ['API connection failed', 'Database timeout'],
        batchNumber: 1,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })
      const text = await response.text()

      expect(text).toContain('event: error')
      expect(text).toContain('"status":"failed"')
      expect(text).toContain('"errors":["API connection failed","Database timeout"]')
    })

    it('should include cancelled event when sync was cancelled', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 50,
        currentContact: '',
        percentage: 50,
        status: 'cancelled',
        errors: [],
        batchNumber: 2,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })
      const text = await response.text()

      expect(text).toContain('event: cancelled')
      expect(text).toContain('"status":"cancelled"')
    })
  })

  describe('Error Handling', () => {
    it('should handle sync progress store errors gracefully', async () => {
      mockGetSyncProgress.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(500)
    })

    it('should handle invalid sync progress data', async () => {
      mockGetSyncProgress.mockResolvedValue({
        syncId: 'sync-123',
        // Missing required fields
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(500)
    })
  })

  describe('Real-Time Updates', () => {
    it('should set up subscription for real-time updates', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 25,
        currentContact: 'John Doe',
        percentage: 25,
        status: 'processing',
        errors: [],
        batchNumber: 1,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)
      mockSubscribeToProgress.mockImplementation((syncId, callback) => {
        // Simulate progress update
        setTimeout(() => {
          callback({
            ...mockProgress,
            processedContacts: 50,
            percentage: 50,
            currentContact: 'Jane Smith',
            batchNumber: 2,
          })
        }, 100)
        return () => {} // Return unsubscribe function
      })

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      expect(mockSubscribeToProgress).toHaveBeenCalledWith('sync-123', expect.any(Function))
    })

    it('should handle subscription cleanup on connection close', async () => {
      const mockProgress = {
        syncId: 'sync-123',
        totalContacts: 100,
        processedContacts: 25,
        currentContact: 'John Doe',
        percentage: 25,
        status: 'processing',
        errors: [],
        batchNumber: 1,
        totalBatches: 4,
      }
      mockGetSyncProgress.mockResolvedValue(mockProgress)
      
      let unsubscribeCalled = false
      mockSubscribeToProgress.mockReturnValue(() => {
        unsubscribeCalled = true
      })

      const request = new NextRequest('http://localhost:3000/api/pipedrive/contacts/sync/progress/sync-123')

      const response = await GET(request, { params: { syncId: 'sync-123' } })

      expect(response.status).toBe(200)
      expect(mockSubscribeToProgress).toHaveBeenCalledWith('sync-123', expect.any(Function))
    })
  })
}) 