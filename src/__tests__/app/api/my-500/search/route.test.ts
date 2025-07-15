import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import app from '@/test-utils/testApp'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/my-500/search/route'

vi.mock('next-auth')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mount the API route handler
app.mountAppRoute('/api/my-500/search', GET)

const mockSession = {
  user: { 
    id: 'user-123', 
    email: 'test@example.com', 
    name: 'Test User',
    pipedriveApiKey: 'mock-key',
  }
}

const mockContacts = [
  {
    id: 'contact-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    organisation: 'Acme Corp',
    warmnessScore: 2,
    lastContacted: '2024-01-01T10:00:00Z',
    addedToCampaign: true,
    pipedrivePersonId: '1',
    syncStatus: 'SYNCED',
    activities: [],
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T11:00:00Z',
  },
  {
    id: 'contact-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    organisation: 'Beta Inc',
    warmnessScore: 5,
    lastContacted: '2024-01-02T10:00:00Z',
    addedToCampaign: false,
    pipedrivePersonId: '2',
    syncStatus: 'SYNCED',
    activities: [],
    createdAt: '2024-01-02T09:00:00Z',
    updatedAt: '2024-01-02T11:00:00Z',
  },
]

describe('/api/my-500/search endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.contact.findMany).mockResolvedValue(mockContacts)
    vi.mocked(prisma.contact.count).mockResolvedValue(mockContacts.length)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should require authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await request(app).get('/api/my-500/search?q=alice')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('should return search results for a query', async () => {
    const res = await request(app).get('/api/my-500/search?q=alice')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Alice Johnson' })
      ])
    )
    expect(res.body.data.pagination).toBeDefined()
    expect(res.body.data.searchStats.query).toBe('alice')
  })

  it('should support pagination', async () => {
    vi.mocked(prisma.contact.count).mockResolvedValue(100)
    const res = await request(app).get('/api/my-500/search?q=&page=2&limit=10')
    expect(res.status).toBe(200)
    expect(res.body.data.pagination.page).toBe(2)
    expect(res.body.data.pagination.limit).toBe(10)
    expect(res.body.data.pagination.total).toBe(100)
    expect(res.body.data.pagination.hasMore).toBe(true)
  })

  it('should support filters and sort', async () => {
    const res = await request(app).get('/api/my-500/search?q=&filter=campaign&sort=warmnessScore&order=asc')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    // Should call prisma.contact.findMany with correct filter/sort
    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-123',
          addedToCampaign: true,
        }),
        orderBy: { warmnessScore: 'asc' },
      })
    )
  })

  it('should handle no results', async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([])
    vi.mocked(prisma.contact.count).mockResolvedValue(0)
    const res = await request(app).get('/api/my-500/search?q=notfound')
    expect(res.status).toBe(200)
    expect(res.body.data.contacts).toHaveLength(0)
    expect(res.body.data.pagination.total).toBe(0)
  })

  it('should handle invalid query params', async () => {
    const res = await request(app).get('/api/my-500/search?page=abc&limit=xyz')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBeDefined()
  })

  it('should handle server errors gracefully', async () => {
    vi.mocked(prisma.contact.findMany).mockRejectedValue(new Error('DB error'))
    const res = await request(app).get('/api/my-500/search?q=alice')
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toContain('DB error')
  })
}) 