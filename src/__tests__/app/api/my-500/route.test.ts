import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getMy500Data } from '@/lib/my-500-data'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/auth')

const mockGetServerSession = vi.mocked(getServerSession)

// Helper to create a user and contacts in the test database
async function createUserWithContacts({ userId, email, contacts = [] }: any) {
  const user = await prisma.user.create({
    data: {
      id: userId,
      email,
      name: 'Test User',
      role: 'CONSULTANT',
    },
  })
  for (const contact of contacts) {
    await prisma.contact.create({
      data: { ...contact, userId: user.id },
    })
  }
  return user
}

describe('My 500 API/server integration', () => {
  beforeEach(async () => {
    await prisma.activity.deleteMany({})
    await prisma.contact.deleteMany({})
    await prisma.user.deleteMany({})
    vi.clearAllMocks()
  })
  afterEach(async () => {
    await prisma.activity.deleteMany({})
    await prisma.contact.deleteMany({})
    await prisma.user.deleteMany({})
  })

  it('returns only the authenticated user contacts', async () => {
    const user = await createUserWithContacts({
      userId: 'user-1',
      email: 'user1@example.com',
      contacts: [
        { id: 'c1', name: 'Contact 1', email: 'c1@example.com', warmnessScore: 5 },
        { id: 'c2', name: 'Contact 2', email: 'c2@example.com', warmnessScore: 2 },
      ],
    })
    await createUserWithContacts({
      userId: 'user-2',
      email: 'user2@example.com',
      contacts: [
        { id: 'c3', name: 'Other Contact', email: 'c3@example.com', warmnessScore: 8 },
      ],
    })
    mockGetServerSession.mockResolvedValue({ user: { id: user.id, email: user.email, role: 'CONSULTANT' } } as any)
    const { contacts, error } = await getMy500Data()
    expect(error).toBeUndefined()
    expect(contacts).toHaveLength(2)
    expect(contacts.every(c => c.userId === user.id)).toBe(true)
  })

  it('rejects unauthenticated users', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { contacts, error } = await getMy500Data()
    expect(contacts).toHaveLength(0)
    expect(error).toMatch(/Authentication required/i)
  })

  it('does not return contacts for other users (RBAC)', async () => {
    await createUserWithContacts({
      userId: 'user-1',
      email: 'user1@example.com',
      contacts: [
        { id: 'c1', name: 'Contact 1', email: 'c1@example.com', warmnessScore: 5 },
      ],
    })
    const user2 = await createUserWithContacts({
      userId: 'user-2',
      email: 'user2@example.com',
      contacts: [
        { id: 'c2', name: 'Other Contact', email: 'c2@example.com', warmnessScore: 8 },
      ],
    })
    mockGetServerSession.mockResolvedValue({ user: { id: user2.id, email: user2.email, role: 'CONSULTANT' } } as any)
    const { contacts } = await getMy500Data()
    expect(contacts).toHaveLength(1)
    expect(contacts[0].userId).toBe(user2.id)
    expect(contacts[0].name).toBe('Other Contact')
  })

  it('returns empty array if user has no contacts', async () => {
    const user = await createUserWithContacts({ userId: 'user-3', email: 'user3@example.com', contacts: [] })
    mockGetServerSession.mockResolvedValue({ user: { id: user.id, email: user.email, role: 'CONSULTANT' } } as any)
    const { contacts } = await getMy500Data()
    expect(contacts).toHaveLength(0)
  })

  it('returns contacts with activities if present', async () => {
    const user = await createUserWithContacts({
      userId: 'user-4',
      email: 'user4@example.com',
      contacts: [
        { id: 'c1', name: 'Contact 1', email: 'c1@example.com', warmnessScore: 5 },
      ],
    })
    const contact = await prisma.contact.findUnique({ where: { id: 'c1' } })
    await prisma.activity.create({
      data: {
        id: 'a1',
        type: 'CALL',
        subject: 'Test Call',
        note: 'Test note',
        dueDate: new Date(),
        contactId: contact!.id,
        userId: user.id,
      },
    })
    mockGetServerSession.mockResolvedValue({ user: { id: user.id, email: user.email, role: 'CONSULTANT' } } as any)
    const { contacts } = await getMy500Data()
    expect(contacts).toHaveLength(1)
    expect(contacts[0].activities.length).toBeGreaterThanOrEqual(1)
    expect(contacts[0].activities[0].subject).toBe('Test Call')
  })
}) 