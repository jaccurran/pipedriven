import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../setup'
import type { User, Campaign, Contact, Activity, UserRole } from '@prisma/client'

describe('Campaign Model', () => {
  // Helper function to create a test user
  const createTestUser = async (email = 'testuser@example.com') => {
    return await prisma.user.create({
      data: {
        email,
        name: 'Test User',
        role: 'CONSULTANT' as UserRole,
      },
    })
  }

  // Helper function to create a test contact
  const createTestContact = async (userId: string, email = 'testcontact@example.com') => {
    return await prisma.contact.create({
      data: {
        name: 'Test Contact',
        email,
        userId,
      },
    })
  }

  describe('Campaign Creation', () => {
    it('should create a campaign with required fields', async () => {
      // Arrange
      const campaignData = {
        name: 'Q1 Lead Generation',
        description: 'Generate leads for Q1 sales',
        sector: 'Technology',
        theme: 'Digital Transformation',
      }

      // Act
      const campaign = await prisma.campaign.create({
        data: campaignData,
      })

      // Assert
      expect(campaign).toBeDefined()
      expect(campaign.id).toBeDefined()
      expect(campaign.name).toBe(campaignData.name)
      expect(campaign.description).toBe(campaignData.description)
      expect(campaign.sector).toBe(campaignData.sector)
      expect(campaign.theme).toBe(campaignData.theme)
      expect(campaign.startDate).toBeNull()
      expect(campaign.endDate).toBeNull()
      expect(campaign.createdAt).toBeInstanceOf(Date)
      expect(campaign.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a campaign with optional date fields', async () => {
      // Arrange
      const campaignData = {
        name: 'Summer Outreach',
        description: 'Summer campaign for new leads',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
      }

      // Act
      const campaign = await prisma.campaign.create({
        data: campaignData,
      })

      // Assert
      expect(campaign.startDate).toEqual(new Date('2024-06-01'))
      expect(campaign.endDate).toEqual(new Date('2024-08-31'))
    })

    it('should create a campaign with minimal required fields', async () => {
      // Arrange
      const campaignData = {
        name: 'Minimal Campaign',
      }

      // Act
      const campaign = await prisma.campaign.create({
        data: campaignData,
      })

      // Assert
      expect(campaign.name).toBe('Minimal Campaign')
      expect(campaign.description).toBeNull()
      expect(campaign.sector).toBeNull()
      expect(campaign.theme).toBeNull()
    })
  })

  describe('Campaign-User Relationships', () => {
    it('should assign users to a campaign', async () => {
      // Arrange
      const testUser1 = await createTestUser('user1@example.com')
      const testUser2 = await createTestUser('user2@example.com')
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Multi-User Campaign',
          users: {
            connect: [
              { id: testUser1.id },
              { id: testUser2.id },
            ],
          },
        },
        include: {
          users: true,
        },
      })

      // Assert
      expect(campaign.users).toHaveLength(2)
      expect(campaign.users[0].id).toBe(testUser1.id)
      expect(campaign.users[1].id).toBe(testUser2.id)
    })

    it('should retrieve campaign with users', async () => {
      // Arrange
      const testUser = await createTestUser()
      const campaign = await prisma.campaign.create({
        data: {
          name: 'User Campaign',
          users: {
            connect: { id: testUser.id },
          },
        },
        include: {
          users: true,
        },
      })

      // Act
      const campaignWithUsers = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        include: {
          users: true,
        },
      })

      // Assert
      expect(campaignWithUsers?.users).toHaveLength(1)
      expect(campaignWithUsers?.users[0].id).toBe(testUser.id)
    })

    it('should retrieve user with campaigns', async () => {
      // Arrange
      const testUser = await createTestUser()
      
      // Create campaigns individually since createMany doesn't support relations
      await prisma.campaign.create({
        data: {
          name: 'Campaign 1',
          users: {
            connect: { id: testUser.id },
          },
        },
      })
      
      await prisma.campaign.create({
        data: {
          name: 'Campaign 2',
          users: {
            connect: { id: testUser.id },
          },
        },
      })

      // Act
      const userWithCampaigns = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: {
          campaigns: true,
        },
      })

      // Assert
      expect(userWithCampaigns?.campaigns).toHaveLength(2)
    })
  })

  describe('Campaign-Contact Relationships', () => {
    it('should assign contacts to a campaign', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact1 = await createTestContact(testUser.id, 'contact1@example.com')
      const contact2 = await createTestContact(testUser.id, 'contact2@example.com')
      
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Contact Campaign',
          contacts: {
            connect: [
              { id: contact1.id },
              { id: contact2.id },
            ],
          },
        },
        include: {
          contacts: true,
        },
      })

      // Assert
      expect(campaign.contacts).toHaveLength(2)
      expect(campaign.contacts[0].id).toBe(contact1.id)
      expect(campaign.contacts[1].id).toBe(contact2.id)
    })

    it('should retrieve campaign with contacts', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await createTestContact(testUser.id)
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Single Contact Campaign',
          contacts: {
            connect: { id: contact.id },
          },
        },
        include: {
          contacts: true,
        },
      })

      // Act
      const campaignWithContacts = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        include: {
          contacts: true,
        },
      })

      // Assert
      expect(campaignWithContacts?.contacts).toHaveLength(1)
      expect(campaignWithContacts?.contacts[0].id).toBe(contact.id)
    })

    it('should update contact campaign assignment status', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await createTestContact(testUser.id)
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Assignment Test Campaign',
        },
      })

      // Act - Assign contact to campaign
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          campaigns: {
            connect: { id: campaign.id },
          },
          addedToCampaign: true,
        },
      })

      // Assert
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
        include: {
          campaigns: true,
        },
      })

      expect(updatedContact?.addedToCampaign).toBe(true)
      expect(updatedContact?.campaigns).toHaveLength(1)
      expect(updatedContact?.campaigns[0].id).toBe(campaign.id)
    })
  })

  describe('Campaign-Activity Relationships', () => {
    it('should create activities for a campaign', async () => {
      // Arrange
      const testUser = await createTestUser()
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Activity Campaign',
        },
      })

      // Act
      const activity = await prisma.activity.create({
        data: {
          type: 'EMAIL',
          subject: 'Campaign Follow-up',
          note: 'Following up on campaign leads',
          campaignId: campaign.id,
          userId: testUser.id,
        },
      })

      // Assert
      expect(activity.campaignId).toBe(campaign.id)
      expect(activity.userId).toBe(testUser.id)
      expect(activity.type).toBe('EMAIL')
    })

    it('should retrieve campaign with activities', async () => {
      // Arrange
      const testUser = await createTestUser()
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Activities Campaign',
        },
      })

      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'Initial Contact',
            campaignId: campaign.id,
            userId: testUser.id,
          },
          {
            type: 'EMAIL',
            subject: 'Follow-up',
            campaignId: campaign.id,
            userId: testUser.id,
          },
        ],
      })

      // Act
      const campaignWithActivities = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        include: {
          activities: true,
        },
      })

      // Assert
      expect(campaignWithActivities?.activities).toHaveLength(2)
      expect(campaignWithActivities?.activities[0].type).toBe('CALL')
      expect(campaignWithActivities?.activities[1].type).toBe('EMAIL')
    })
  })

  describe('Campaign Lifecycle Management', () => {
    it('should update campaign dates', async () => {
      // Arrange
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Date Update Campaign',
        },
      })

      const newStartDate = new Date('2024-03-01')
      const newEndDate = new Date('2024-05-31')

      // Act
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
        },
      })

      // Assert
      expect(updatedCampaign.startDate).toEqual(newStartDate)
      expect(updatedCampaign.endDate).toEqual(newEndDate)
    })

    it('should update campaign details', async () => {
      // Arrange
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Original Name',
          description: 'Original description',
          sector: 'Original sector',
          theme: 'Original theme',
        },
      })

      // Act
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          name: 'Updated Name',
          description: 'Updated description',
          sector: 'Updated sector',
          theme: 'Updated theme',
        },
      })

      // Assert
      expect(updatedCampaign.name).toBe('Updated Name')
      expect(updatedCampaign.description).toBe('Updated description')
      expect(updatedCampaign.sector).toBe('Updated sector')
      expect(updatedCampaign.theme).toBe('Updated theme')
      expect(updatedCampaign.updatedAt.getTime()).toBeGreaterThanOrEqual(campaign.updatedAt.getTime())
    })
  })

  describe('Campaign Retrieval and Queries', () => {
    it('should find campaigns by sector', async () => {
      // Arrange
      await prisma.campaign.createMany({
        data: [
          {
            name: 'Tech Campaign 1',
            sector: 'Technology',
          },
          {
            name: 'Tech Campaign 2',
            sector: 'Technology',
          },
          {
            name: 'Finance Campaign',
            sector: 'Finance',
          },
        ],
      })

      // Act
      const techCampaigns = await prisma.campaign.findMany({
        where: { sector: 'Technology' },
      })

      // Assert
      expect(techCampaigns).toHaveLength(2)
      expect(techCampaigns[0].sector).toBe('Technology')
      expect(techCampaigns[1].sector).toBe('Technology')
    })

    it('should find campaigns by date range', async () => {
      // Arrange
      await prisma.campaign.createMany({
        data: [
          {
            name: 'Q1 Campaign',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
          },
          {
            name: 'Q2 Campaign',
            startDate: new Date('2024-04-01'),
            endDate: new Date('2024-06-30'),
          },
          {
            name: 'Q3 Campaign',
            startDate: new Date('2024-07-01'),
            endDate: new Date('2024-09-30'),
          },
        ],
      })

      // Act
      const q2Campaigns = await prisma.campaign.findMany({
        where: {
          startDate: {
            gte: new Date('2024-04-01'),
            lte: new Date('2024-06-30'),
          },
        },
      })

      // Assert
      expect(q2Campaigns).toHaveLength(1)
      expect(q2Campaigns[0].name).toBe('Q2 Campaign')
    })

    it('should find active campaigns (with start date but no end date)', async () => {
      // Arrange
      await prisma.campaign.createMany({
        data: [
          {
            name: 'Active Campaign 1',
            startDate: new Date('2024-01-01'),
          },
          {
            name: 'Active Campaign 2',
            startDate: new Date('2024-02-01'),
          },
          {
            name: 'Completed Campaign',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
          },
        ],
      })

      // Act
      const activeCampaigns = await prisma.campaign.findMany({
        where: {
          startDate: { not: null },
          endDate: null,
        },
      })

      // Assert
      expect(activeCampaigns).toHaveLength(2)
      expect(activeCampaigns[0].name).toBe('Active Campaign 1')
      expect(activeCampaigns[1].name).toBe('Active Campaign 2')
    })
  })

  describe('Campaign Complex Queries', () => {
    it('should find campaigns with user and contact counts', async () => {
      // Arrange
      const testUser1 = await createTestUser('user1@example.com')
      const testUser2 = await createTestUser('user2@example.com')
      const contact1 = await createTestContact(testUser1.id, 'contact1@example.com')
      const contact2 = await createTestContact(testUser1.id, 'contact2@example.com')
      const contact3 = await createTestContact(testUser2.id, 'contact3@example.com')

      const campaign = await prisma.campaign.create({
        data: {
          name: 'Complex Campaign',
          users: {
            connect: [
              { id: testUser1.id },
              { id: testUser2.id },
            ],
          },
          contacts: {
            connect: [
              { id: contact1.id },
              { id: contact2.id },
              { id: contact3.id },
            ],
          },
        },
        include: {
          users: true,
          contacts: true,
        },
      })

      // Assert
      expect(campaign.users).toHaveLength(2)
      expect(campaign.contacts).toHaveLength(3)
    })

    it('should find campaigns with recent activities', async () => {
      // Arrange
      const testUser = await createTestUser()
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Recent Activity Campaign',
        },
      })

      // Create activities with different timestamps to ensure predictable ordering
      const callActivity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Recent Call',
          campaignId: campaign.id,
          userId: testUser.id,
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      })
      
      const emailActivity = await prisma.activity.create({
        data: {
          type: 'EMAIL',
          subject: 'Recent Email',
          campaignId: campaign.id,
          userId: testUser.id,
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      })

      // Act
      const campaignWithRecentActivities = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })

      // Assert
      expect(campaignWithRecentActivities?.activities).toHaveLength(2)
      expect(campaignWithRecentActivities?.activities[0].type).toBe('EMAIL')
      expect(campaignWithRecentActivities?.activities[1].type).toBe('CALL')
    })
  })

  describe('Campaign Deletion', () => {
    it('should delete a campaign', async () => {
      // Arrange
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Delete Campaign',
        },
      })

      // Act
      await prisma.campaign.delete({
        where: { id: campaign.id },
      })

      // Assert
      const deletedCampaign = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(deletedCampaign).toBeNull()
    })

    it('should handle campaign deletion with related data', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await createTestContact(testUser.id)
      
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Related Data Campaign',
          users: {
            connect: { id: testUser.id },
          },
          contacts: {
            connect: { id: contact.id },
          },
        },
      })

      await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Test Activity',
          campaignId: campaign.id,
          userId: testUser.id,
        },
      })

      // Act
      await prisma.campaign.delete({
        where: { id: campaign.id },
      })

      // Assert
      const deletedCampaign = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(deletedCampaign).toBeNull()

      // Check that related activities have campaignId set to null
      const activities = await prisma.activity.findMany({
        where: { campaignId: campaign.id },
      })
      expect(activities).toHaveLength(0)
    })
  })
}) 