import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import app from '@/test-utils/testApp'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/my-500/route'

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
app.mountAppRoute('/api/my-500', GET)

const mockSession = {
  user: { 
    id: 'user-123', 
    email: 'test@example.com', 
    name: 'Test User',
    pipedriveApiKey: 'test-api-key'
  }
}

const mockContacts = [
  {
    id: 'contact-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    organisation: 'Acme Corp',
    warmnessScore: 2,
    lastContacted: new Date('2024-01-01T10:00:00Z'),
    addedToCampaign: true,
    pipedrivePersonId: '1',
    syncStatus: 'SYNCED',
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z'),
    userId: 'user-123',
    activities: [],
  },
  {
    id: 'contact-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    organisation: 'Beta Inc',
    warmnessScore: 5,
    lastContacted: new Date('2024-01-02T10:00:00Z'),
    addedToCampaign: false,
    pipedrivePersonId: '2',
    syncStatus: 'SYNCED',
    createdAt: new Date('2024-01-02T09:00:00Z'),
    updatedAt: new Date('2024-01-02T11:00:00Z'),
    userId: 'user-123',
    activities: [],
  },
  {
    id: 'contact-3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    organisation: 'Gamma LLC',
    warmnessScore: 1,
    lastContacted: null,
    addedToCampaign: false,
    pipedrivePersonId: '3',
    syncStatus: 'SYNCED',
    createdAt: new Date('2024-01-03T09:00:00Z'),
    updatedAt: new Date('2024-01-03T11:00:00Z'),
    userId: 'user-123',
    activities: [],
  }
]

describe('/api/my-500 endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.contact.findMany).mockResolvedValue(mockContacts)
    vi.mocked(prisma.contact.count).mockResolvedValue(mockContacts.length)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      lastSyncTimestamp: new Date('2024-01-01T08:00:00Z'),
      syncStatus: 'SYNCED',
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await request(app).get('/api/my-500')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/auth/i)
  })

  it('should return contacts sorted by priority algorithm', async () => {
    // Mock the sorted contacts (as they would be returned by the database)
    const sortedContacts = [
      mockContacts[0], // Alice Johnson (addedToCampaign: true)
      mockContacts[2], // Charlie Brown (warmnessScore: 1, lastContacted: null)
      mockContacts[1], // Bob Smith (warmnessScore: 5)
    ]
    vi.mocked(prisma.contact.findMany).mockResolvedValue(sortedContacts)
    
    const res = await request(app).get('/api/my-500')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const contacts = res.body.data.contacts
    // Priority: addedToCampaign, warmnessScore ASC, lastContacted ASC/null, createdAt DESC
    expect(contacts[0].addedToCampaign).toBe(true)
    expect(contacts[1].warmnessScore).toBe(1)
    expect(contacts[2].name).toBe('Bob Smith')
  })

  it('should support pagination', async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([mockContacts[0]])
    vi.mocked(prisma.contact.count).mockResolvedValue(3)
    const res = await request(app).get('/api/my-500?page=1&limit=1')
    expect(res.status).toBe(200)
    expect(res.body.data.contacts).toHaveLength(1)
    expect(res.body.data.pagination.page).toBe(1)
    expect(res.body.data.pagination.limit).toBe(1)
    expect(res.body.data.pagination.total).toBe(3)
  })

  it('should support search by name/email/organisation', async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([mockContacts[1]])
    const res = await request(app).get('/api/my-500?search=Bob')
    expect(res.status).toBe(200)
    expect(res.body.data.contacts[0].name).toBe('Bob Smith')
  })

  it('should return sync status and pagination info', async () => {
    const res = await request(app).get('/api/my-500')
    expect(res.status).toBe(200)
    expect(res.body.data.syncStatus.lastSync).toBeTruthy()
    expect(res.body.data.pagination.total).toBe(mockContacts.length)
  })

  it('should handle empty state', async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([])
    vi.mocked(prisma.contact.count).mockResolvedValue(0)
    const res = await request(app).get('/api/my-500')
    expect(res.status).toBe(200)
    expect(res.body.data.contacts).toHaveLength(0)
  })

  it('should handle database errors gracefully', async () => {
    vi.mocked(prisma.contact.findMany).mockRejectedValue(new Error('DB error'))
    const res = await request(app).get('/api/my-500')
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/db error/i)
  })
}) 