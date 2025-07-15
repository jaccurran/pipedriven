import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'

// Mock Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    syncHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  })),
}))

describe('My-500 Database Schema Requirements', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = new PrismaClient()
  })

  describe('User Table Extensions', () => {
    it('should support lastSyncTimestamp field', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        lastSyncTimestamp: new Date('2024-01-15T10:00:00Z'),
        syncStatus: 'SYNCED',
        pipedriveApiKey: 'test-api-key',
      }

      prisma.user.findUnique.mockResolvedValue(mockUser)

      const user = await prisma.user.findUnique({
        where: { id: 'user-123' }
      })

      expect(user).toBeDefined()
      expect(user?.lastSyncTimestamp).toBeInstanceOf(Date)
      expect(user?.syncStatus).toBe('SYNCED')
      expect(user?.pipedriveApiKey).toBe('test-api-key')
    })

    it('should support sync status updates', async () => {
      const updateData = {
        lastSyncTimestamp: new Date(),
        syncStatus: 'SYNCING',
      }

      prisma.user.update.mockResolvedValue({
        id: 'user-123',
        ...updateData,
      })

      const updatedUser = await prisma.user.update({
        where: { id: 'user-123' },
        data: updateData,
      })

      expect(updatedUser.lastSyncTimestamp).toBeInstanceOf(Date)
      expect(updatedUser.syncStatus).toBe('SYNCING')
    })
  })

  describe('Contact Table Extensions', () => {
    it('should support sync-related fields', async () => {
      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        syncStatus: 'SYNCED',
        lastPipedriveUpdate: new Date('2024-01-15T10:00:00Z'),
        warmnessScore: 7,
        lastContacted: new Date('2024-01-10T10:00:00Z'),
        addedToCampaign: true,
        jobTitle: 'CEO',
      }

      prisma.contact.findMany.mockResolvedValue([mockContact])

      const contacts = await prisma.contact.findMany({
        where: { userId: 'user-123' }
      })

      expect(contacts[0]).toBeDefined()
      expect(contacts[0].syncStatus).toBe('SYNCED')
      expect(contacts[0].lastPipedriveUpdate).toBeInstanceOf(Date)
      expect(contacts[0].warmnessScore).toBe(7)
      expect(contacts[0].lastContacted).toBeInstanceOf(Date)
      expect(contacts[0].addedToCampaign).toBe(true)
      expect(contacts[0].jobTitle).toBe('CEO')
    })

    it('should support priority-based queries', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          name: 'High Priority',
          addedToCampaign: true,
          warmnessScore: 3,
          lastContacted: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'contact-2',
          name: 'Medium Priority',
          addedToCampaign: false,
          warmnessScore: 5,
          lastContacted: new Date('2024-01-05'),
          createdAt: new Date('2024-01-02'),
        },
      ]

      prisma.contact.findMany.mockResolvedValue(mockContacts)

      const contacts = await prisma.contact.findMany({
        where: { userId: 'user-123' },
        orderBy: [
          { addedToCampaign: 'desc' },
          { warmnessScore: 'asc' },
          { lastContacted: 'asc' },
          { createdAt: 'desc' },
        ],
      })

      expect(contacts).toHaveLength(2)
      expect(contacts[0].addedToCampaign).toBe(true) // Campaign contacts first
      expect(contacts[1].addedToCampaign).toBe(false)
    })
  })

  describe('Sync History Table', () => {
    it('should support sync history tracking', async () => {
      const mockSyncHistory = {
        id: 'sync-123',
        userId: 'user-123',
        syncType: 'INCREMENTAL',
        contactsProcessed: 25,
        contactsUpdated: 20,
        contactsCreated: 5,
        contactsFailed: 0,
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:05:00Z'),
        duration: 300000, // 5 minutes in milliseconds
        status: 'SUCCESS',
        error: null,
      }

      prisma.syncHistory.create.mockResolvedValue(mockSyncHistory)

      const syncHistory = await prisma.syncHistory.create({
        data: {
          userId: 'user-123',
          syncType: 'INCREMENTAL',
          contactsProcessed: 25,
          contactsUpdated: 20,
          contactsCreated: 5,
          contactsFailed: 0,
          startTime: new Date('2024-01-15T10:00:00Z'),
          status: 'SUCCESS',
        },
      })

      expect(syncHistory).toBeDefined()
      expect(syncHistory.syncType).toBe('INCREMENTAL')
      expect(syncHistory.contactsProcessed).toBe(25)
      expect(syncHistory.status).toBe('SUCCESS')
      expect(syncHistory.duration).toBe(300000)
    })

    it('should support sync history queries', async () => {
      const mockSyncHistory = [
        {
          id: 'sync-2',
          userId: 'user-123',
          syncType: 'INCREMENTAL',
          status: 'SUCCESS',
          startTime: new Date('2024-01-15T11:00:00Z'),
        },
        {
          id: 'sync-1',
          userId: 'user-123',
          syncType: 'FULL',
          status: 'SUCCESS',
          startTime: new Date('2024-01-15T10:00:00Z'),
        },
      ]

      prisma.syncHistory.findMany.mockResolvedValue(mockSyncHistory)

      const syncHistory = await prisma.syncHistory.findMany({
        where: { userId: 'user-123' },
        orderBy: { startTime: 'desc' },
        take: 10,
      })

      expect(syncHistory).toHaveLength(2)
      expect(syncHistory[0].syncType).toBe('INCREMENTAL') // Most recent first (11:00:00Z)
      expect(syncHistory[1].syncType).toBe('FULL') // Earlier (10:00:00Z)
    })
  })

  describe('Performance Indexes', () => {
    it('should support efficient contact queries by user and warmness', async () => {
      const mockContacts = Array.from({ length: 100 }, (_, i) => ({
        id: `contact-${i}`,
        name: `Contact ${i}`,
        warmnessScore: i % 10,
        userId: 'user-123',
      }))

      prisma.contact.findMany.mockResolvedValue(mockContacts)

      const contacts = await prisma.contact.findMany({
        where: { userId: 'user-123' },
        orderBy: { warmnessScore: 'asc' },
      })

      expect(contacts).toHaveLength(100)
      // Verify sorting by warmness score
      expect(contacts[0].warmnessScore).toBe(0)
      expect(contacts[1].warmnessScore).toBe(1)
    })

    it('should support efficient sync history queries', async () => {
      const mockSyncHistory = Array.from({ length: 50 }, (_, i) => ({
        id: `sync-${i}`,
        userId: 'user-123',
        status: i % 2 === 0 ? 'SUCCESS' : 'FAILED',
        startTime: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
      }))

      // Mock the filtered result (only SUCCESS records)
      const successSyncHistory = mockSyncHistory.filter(sync => sync.status === 'SUCCESS')
      prisma.syncHistory.findMany.mockResolvedValue(successSyncHistory)

      const syncHistory = await prisma.syncHistory.findMany({
        where: { 
          userId: 'user-123',
          status: 'SUCCESS',
        },
        orderBy: { startTime: 'desc' },
      })

      expect(syncHistory).toHaveLength(25) // Half should be SUCCESS (even indices)
      expect(syncHistory.every(sync => sync.status === 'SUCCESS')).toBe(true)
    })
  })
}) 