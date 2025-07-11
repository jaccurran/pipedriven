import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../setup'
import type { User, Campaign, PipedriveSync, SyncStatus } from '@prisma/client'

beforeEach(async () => {
  // Clean up all related tables to ensure test isolation
  await prisma.pipedriveSync.deleteMany({})
  await prisma.campaign.deleteMany({})
  await prisma.user.deleteMany({})
})

describe('PipedriveSync Model', () => {
  // Helper function to create a test user
  const createTestUser = async (email = 'testuser@example.com') => {
    return await prisma.user.create({
      data: {
        email,
        name: 'Test User',
        role: 'CONSULTANT',
      },
    })
  }

  // Helper function to create a test campaign
  const createTestCampaign = async (name = 'Test Campaign') => {
    return await prisma.campaign.create({
      data: {
        name,
      },
    })
  }

  describe('PipedriveSync Creation', () => {
    it('should create a sync record for a user', async () => {
      // Arrange
      const user = await createTestUser()
      const syncData = {
        userId: user.id,
        entityType: 'USER',
        entityId: user.id,
        status: 'PENDING' as SyncStatus,
      }

      // Act
      const sync = await prisma.pipedriveSync.create({ data: syncData })

      // Assert
      expect(sync).toBeDefined()
      expect(sync.userId).toBe(user.id)
      expect(sync.entityType).toBe('USER')
      expect(sync.entityId).toBe(user.id)
      expect(sync.status).toBe('PENDING')
      expect(sync.error).toBeNull()
      expect(sync.createdAt).toBeInstanceOf(Date)
      expect(sync.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a sync record for a campaign', async () => {
      // Arrange
      const user = await createTestUser()
      const campaign = await createTestCampaign()
      const syncData = {
        userId: user.id,
        entityType: 'CAMPAIGN',
        entityId: campaign.id,
        status: 'SUCCESS' as SyncStatus,
      }

      // Act
      const sync = await prisma.pipedriveSync.create({ data: syncData })

      // Assert
      expect(sync.entityType).toBe('CAMPAIGN')
      expect(sync.entityId).toBe(campaign.id)
      expect(sync.status).toBe('SUCCESS')
    })

    it('should create sync records with all sync statuses', async () => {
      // Arrange
      const user = await createTestUser()
      const statuses: SyncStatus[] = ['PENDING', 'SUCCESS', 'FAILED', 'RETRY']

      // Act
      const syncs = await Promise.all(
        statuses.map(status =>
          prisma.pipedriveSync.create({
            data: {
              userId: user.id,
              entityType: 'USER',
              entityId: user.id,
              status,
            },
          })
        )
      )

      // Assert
      expect(syncs).toHaveLength(4)
      syncs.forEach((sync, index) => {
        expect(sync.status).toBe(statuses[index])
      })
    })
  })

  describe('PipedriveSync Relationships', () => {
    it('should enforce user relationship constraint', async () => {
      // Arrange
      const syncData = {
        userId: 'non-existent-user-id',
        entityType: 'USER',
        entityId: 'non-existent-user-id',
        status: 'PENDING' as SyncStatus,
      }

      // Act & Assert
      await expect(
        prisma.pipedriveSync.create({ data: syncData })
      ).rejects.toThrow()
    })

    it('should retrieve sync with user', async () => {
      // Arrange
      const user = await createTestUser()
      const sync = await prisma.pipedriveSync.create({
        data: {
          userId: user.id,
          entityType: 'USER',
          entityId: user.id,
          status: 'SUCCESS',
        },
        include: {
          user: true,
        },
      })

      // Assert
      expect(sync.user).toBeDefined()
      expect(sync.user.id).toBe(user.id)
    })
  })

  describe('PipedriveSync Status and Error Handling', () => {
    it('should update sync status', async () => {
      // Arrange
      const user = await createTestUser()
      const sync = await prisma.pipedriveSync.create({
        data: {
          userId: user.id,
          entityType: 'USER',
          entityId: user.id,
          status: 'PENDING',
        },
      })

      // Act
      const updated = await prisma.pipedriveSync.update({
        where: { id: sync.id },
        data: {
          status: 'SUCCESS',
        },
      })

      // Assert
      expect(updated.status).toBe('SUCCESS')
    })

    it('should record sync errors', async () => {
      // Arrange
      const user = await createTestUser()
      const sync = await prisma.pipedriveSync.create({
        data: {
          userId: user.id,
          entityType: 'USER',
          entityId: user.id,
          status: 'PENDING',
        },
      })
      const errorMsg = 'API rate limit exceeded'

      // Act
      const updated = await prisma.pipedriveSync.update({
        where: { id: sync.id },
        data: {
          status: 'FAILED',
          error: errorMsg,
        },
      })

      // Assert
      expect(updated.status).toBe('FAILED')
      expect(updated.error).toBe(errorMsg)
    })
  })

  describe('PipedriveSync Queries', () => {
    it('should find syncs by status', async () => {
      // Arrange
      const user = await createTestUser()
      await prisma.pipedriveSync.createMany({
        data: [
          { userId: user.id, entityType: 'USER', entityId: user.id, status: 'SUCCESS' },
          { userId: user.id, entityType: 'USER', entityId: user.id, status: 'FAILED' },
        ],
      })

      // Act
      const failedSyncs = await prisma.pipedriveSync.findMany({ where: { status: 'FAILED' } })
      const successSyncs = await prisma.pipedriveSync.findMany({ where: { status: 'SUCCESS' } })

      // Assert
      expect(failedSyncs).toHaveLength(1)
      expect(failedSyncs[0].status).toBe('FAILED')
      expect(successSyncs).toHaveLength(1)
      expect(successSyncs[0].status).toBe('SUCCESS')
    })

    it('should find syncs by entity type', async () => {
      // Arrange
      const user = await createTestUser()
      await prisma.pipedriveSync.createMany({
        data: [
          { userId: user.id, entityType: 'USER', entityId: user.id, status: 'SUCCESS' },
          { userId: user.id, entityType: 'CAMPAIGN', entityId: 'campaign-1', status: 'SUCCESS' },
        ],
      })

      // Act
      const userSyncs = await prisma.pipedriveSync.findMany({ where: { entityType: 'USER' } })
      const campaignSyncs = await prisma.pipedriveSync.findMany({ where: { entityType: 'CAMPAIGN' } })

      // Assert
      expect(userSyncs).toHaveLength(1)
      expect(userSyncs[0].entityType).toBe('USER')
      expect(campaignSyncs).toHaveLength(1)
      expect(campaignSyncs[0].entityType).toBe('CAMPAIGN')
    })
  })

  describe('PipedriveSync Deletion', () => {
    it('should delete a sync record', async () => {
      // Arrange
      const user = await createTestUser()
      const sync = await prisma.pipedriveSync.create({
        data: {
          userId: user.id,
          entityType: 'USER',
          entityId: user.id,
          status: 'PENDING',
        },
      })

      // Act
      await prisma.pipedriveSync.delete({ where: { id: sync.id } })

      // Assert
      const deleted = await prisma.pipedriveSync.findUnique({ where: { id: sync.id } })
      expect(deleted).toBeNull()
    })
  })
}) 