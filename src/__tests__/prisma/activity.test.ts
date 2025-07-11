import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../setup'
import type { User, Contact, Campaign, Activity, UserRole, ActivityType } from '@prisma/client'

beforeEach(async () => {
  // Clean up all related tables to ensure test isolation
  await prisma.activity.deleteMany({})
  await prisma.contact.deleteMany({})
  await prisma.campaign.deleteMany({})
  await prisma.user.deleteMany({})
})

describe('Activity Model', () => {
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

  // Helper function to create a test campaign
  const createTestCampaign = async (name = 'Test Campaign') => {
    return await prisma.campaign.create({
      data: {
        name,
      },
    })
  }

  describe('Activity Creation', () => {
    it('should create an activity with required fields', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activityData = {
        type: 'CALL' as ActivityType,
        subject: 'Initial Contact Call',
        note: 'First call to introduce our services',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        userId: testUser.id,
      }

      // Act
      const activity = await prisma.activity.create({
        data: activityData,
      })

      // Assert
      expect(activity).toBeDefined()
      expect(activity.id).toBeDefined()
      expect(activity.type).toBe(activityData.type)
      expect(activity.subject).toBe(activityData.subject)
      expect(activity.note).toBe(activityData.note)
      expect(activity.dueDate).toEqual(activityData.dueDate)
      expect(activity.userId).toBe(testUser.id)
      expect(activity.contactId).toBeNull()
      expect(activity.campaignId).toBeNull()
      expect(activity.createdAt).toBeInstanceOf(Date)
      expect(activity.updatedAt).toBeInstanceOf(Date)
    })

    it('should create an activity with minimal required fields', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activityData = {
        type: 'EMAIL' as ActivityType,
        userId: testUser.id,
      }

      // Act
      const activity = await prisma.activity.create({
        data: activityData,
      })

      // Assert
      expect(activity.type).toBe('EMAIL')
      expect(activity.subject).toBeNull()
      expect(activity.note).toBeNull()
      expect(activity.dueDate).toBeNull()
      expect(activity.userId).toBe(testUser.id)
    })

    it('should create activities with all activity types', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activityTypes: ActivityType[] = ['CALL', 'EMAIL', 'MEETING', 'LINKEDIN', 'REFERRAL', 'CONFERENCE']

      // Act
      const activities = await Promise.all(
        activityTypes.map((type, index) =>
          prisma.activity.create({
            data: {
              type,
              subject: `${type} Activity ${index + 1}`,
              userId: testUser.id,
            },
          })
        )
      )

      // Assert
      expect(activities).toHaveLength(6)
      activities.forEach((activity, index) => {
        expect(activity.type).toBe(activityTypes[index])
        expect(activity.subject).toBe(`${activityTypes[index]} Activity ${index + 1}`)
      })
    })
  })

  describe('Activity-User Relationships', () => {
    it('should enforce user relationship constraint', async () => {
      // Arrange
      const activityData = {
        type: 'CALL' as ActivityType,
        subject: 'Invalid Activity',
        userId: 'non-existent-user-id',
      }

      // Act & Assert
      await expect(
        prisma.activity.create({
          data: activityData,
        })
      ).rejects.toThrow()
    })

    it('should retrieve activity with user information', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'User Activity',
          userId: testUser.id,
        },
        include: {
          user: true,
        },
      })

      // Assert
      expect(activity.user).toBeDefined()
      expect(activity.user.id).toBe(testUser.id)
      expect(activity.user.email).toBe(testUser.email)
      expect(activity.user.name).toBe(testUser.name)
    })

    it('should retrieve user with activities', async () => {
      // Arrange
      const testUser = await createTestUser()
      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'Activity 1',
            userId: testUser.id,
          },
          {
            type: 'EMAIL',
            subject: 'Activity 2',
            userId: testUser.id,
          },
        ],
      })

      // Act
      const userWithActivities = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: {
          activities: true,
        },
      })

      // Assert
      expect(userWithActivities?.activities).toHaveLength(2)
      expect(userWithActivities?.activities[0].type).toBe('CALL')
      expect(userWithActivities?.activities[1].type).toBe('EMAIL')
    })

    it('should cascade delete activities when user is deleted', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Cascade Activity',
          userId: testUser.id,
        },
      })

      // Act
      await prisma.user.delete({
        where: { id: testUser.id },
      })

      // Assert
      const deletedActivity = await prisma.activity.findUnique({
        where: { id: activity.id },
      })
      expect(deletedActivity).toBeNull()
    })
  })

  describe('Activity-Contact Relationships', () => {
    it('should create activity with contact relationship', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await createTestContact(testUser.id)
      const activityData = {
        type: 'CALL' as ActivityType,
        subject: 'Contact Follow-up',
        note: 'Following up with contact about proposal',
        userId: testUser.id,
        contactId: contact.id,
      }

      // Act
      const activity = await prisma.activity.create({
        data: activityData,
        include: {
          contact: true,
        },
      })

      // Assert
      expect(activity.contactId).toBe(contact.id)
      expect(activity.contact).toBeDefined()
      expect(activity.contact?.id).toBe(contact.id)
      expect(activity.contact?.name).toBe(contact.name)
    })

    it('should retrieve contact with activities', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await createTestContact(testUser.id)
      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'Initial Call',
            userId: testUser.id,
            contactId: contact.id,
          },
          {
            type: 'EMAIL',
            subject: 'Follow-up Email',
            userId: testUser.id,
            contactId: contact.id,
          },
        ],
      })

      // Act
      const contactWithActivities = await prisma.contact.findUnique({
        where: { id: contact.id },
        include: {
          activities: true,
        },
      })

      // Assert
      expect(contactWithActivities?.activities).toHaveLength(2)
      expect(contactWithActivities?.activities[0].type).toBe('CALL')
      expect(contactWithActivities?.activities[1].type).toBe('EMAIL')
    })

    it('should set contactId to null when contact is deleted', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await createTestContact(testUser.id)
      const activity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Contact Activity',
          userId: testUser.id,
          contactId: contact.id,
        },
      })

      // Act
      await prisma.contact.delete({
        where: { id: contact.id },
      })

      // Assert
      const updatedActivity = await prisma.activity.findUnique({
        where: { id: activity.id },
      })
      expect(updatedActivity?.contactId).toBeNull()
    })
  })

  describe('Activity-Campaign Relationships', () => {
    it('should create activity with campaign relationship', async () => {
      // Arrange
      const testUser = await createTestUser()
      const campaign = await createTestCampaign()
      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Campaign Outreach',
        note: 'Sending campaign email to prospects',
        userId: testUser.id,
        campaignId: campaign.id,
      }

      // Act
      const activity = await prisma.activity.create({
        data: activityData,
        include: {
          campaign: true,
        },
      })

      // Assert
      expect(activity.campaignId).toBe(campaign.id)
      expect(activity.campaign).toBeDefined()
      expect(activity.campaign?.id).toBe(campaign.id)
      expect(activity.campaign?.name).toBe(campaign.name)
    })

    it('should retrieve campaign with activities', async () => {
      // Arrange
      const testUser = await createTestUser()
      const campaign = await createTestCampaign()
      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'Campaign Call 1',
            userId: testUser.id,
            campaignId: campaign.id,
          },
          {
            type: 'EMAIL',
            subject: 'Campaign Email 1',
            userId: testUser.id,
            campaignId: campaign.id,
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

    it('should set campaignId to null when campaign is deleted', async () => {
      // Arrange
      const testUser = await createTestUser()
      const campaign = await createTestCampaign()
      const activity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Campaign Activity',
          userId: testUser.id,
          campaignId: campaign.id,
        },
      })

      // Act
      await prisma.campaign.delete({
        where: { id: campaign.id },
      })

      // Assert
      const updatedActivity = await prisma.activity.findUnique({
        where: { id: activity.id },
      })
      expect(updatedActivity?.campaignId).toBeNull()
    })
  })

  describe('Activity Complex Relationships', () => {
    it('should create activity with user, contact, and campaign', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await createTestContact(testUser.id)
      const campaign = await createTestCampaign()
      const activityData = {
        type: 'MEETING' as ActivityType,
        subject: 'Complex Activity',
        note: 'Meeting with contact about campaign',
        dueDate: new Date('2024-01-20T14:00:00Z'),
        userId: testUser.id,
        contactId: contact.id,
        campaignId: campaign.id,
      }

      // Act
      const activity = await prisma.activity.create({
        data: activityData,
        include: {
          user: true,
          contact: true,
          campaign: true,
        },
      })

      // Assert
      expect(activity.userId).toBe(testUser.id)
      expect(activity.contactId).toBe(contact.id)
      expect(activity.campaignId).toBe(campaign.id)
      expect(activity.user).toBeDefined()
      expect(activity.contact).toBeDefined()
      expect(activity.campaign).toBeDefined()
    })
  })

  describe('Activity Due Date Management', () => {
    it('should handle due date updates', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Due Date Activity',
          dueDate: new Date('2024-01-15T10:00:00Z'),
          userId: testUser.id,
        },
      })

      const newDueDate = new Date('2024-01-20T15:00:00Z')

      // Act
      const updatedActivity = await prisma.activity.update({
        where: { id: activity.id },
        data: {
          dueDate: newDueDate,
        },
      })

      // Assert
      expect(updatedActivity.dueDate).toEqual(newDueDate)
    })

    it('should handle null due date', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activity = await prisma.activity.create({
        data: {
          type: 'EMAIL',
          subject: 'No Due Date Activity',
          dueDate: new Date('2024-01-15T10:00:00Z'),
          userId: testUser.id,
        },
      })

      // Act
      const updatedActivity = await prisma.activity.update({
        where: { id: activity.id },
        data: {
          dueDate: null,
        },
      })

      // Assert
      expect(updatedActivity.dueDate).toBeNull()
    })

    it('should find activities by due date range', async () => {
      // Arrange
      const testUser = await createTestUser()
      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'Past Due',
            dueDate: new Date('2024-01-10T10:00:00Z'),
            userId: testUser.id,
          },
          {
            type: 'EMAIL',
            subject: 'Current Due',
            dueDate: new Date('2024-01-15T10:00:00Z'),
            userId: testUser.id,
          },
          {
            type: 'MEETING',
            subject: 'Future Due',
            dueDate: new Date('2024-01-20T10:00:00Z'),
            userId: testUser.id,
          },
        ],
      })

      // Act
      const currentActivities = await prisma.activity.findMany({
        where: {
          dueDate: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lte: new Date('2024-01-15T23:59:59Z'),
          },
        },
      })

      // Assert
      expect(currentActivities).toHaveLength(1)
      expect(currentActivities[0].subject).toBe('Current Due')
    })
  })

  describe('Activity Retrieval and Queries', () => {
    it('should find activities by type', async () => {
      // Arrange
      const testUser = await createTestUser()
      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'Call 1',
            userId: testUser.id,
          },
          {
            type: 'CALL',
            subject: 'Call 2',
            userId: testUser.id,
          },
          {
            type: 'EMAIL',
            subject: 'Email 1',
            userId: testUser.id,
          },
        ],
      })

      // Act
      const callActivities = await prisma.activity.findMany({
        where: { type: 'CALL' },
      })

      // Assert
      expect(callActivities).toHaveLength(2)
      expect(callActivities[0].type).toBe('CALL')
      expect(callActivities[1].type).toBe('CALL')
    })

    it('should find activities by user', async () => {
      // Arrange
      const testUser1 = await createTestUser('user1@example.com')
      const testUser2 = await createTestUser('user2@example.com')
      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'User 1 Activity',
            userId: testUser1.id,
          },
          {
            type: 'EMAIL',
            subject: 'User 2 Activity',
            userId: testUser2.id,
          },
        ],
      })

      // Act
      const user1Activities = await prisma.activity.findMany({
        where: { userId: testUser1.id },
      })

      // Assert
      expect(user1Activities).toHaveLength(1)
      expect(user1Activities[0].subject).toBe('User 1 Activity')
    })

    it('should find overdue activities', async () => {
      // Arrange
      const testUser = await createTestUser()
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1) // Yesterday

      await prisma.activity.createMany({
        data: [
          {
            type: 'CALL',
            subject: 'Overdue Activity',
            dueDate: pastDate,
            userId: testUser.id,
          },
          {
            type: 'EMAIL',
            subject: 'Current Activity',
            dueDate: new Date(),
            userId: testUser.id,
          },
        ],
      })

      // Act
      const overdueActivities = await prisma.activity.findMany({
        where: {
          dueDate: {
            lt: new Date(),
          },
          userId: testUser.id, // Filter by user to avoid picking up other test data
        },
      })

      // Assert
      expect(overdueActivities).toHaveLength(1)
      expect(overdueActivities[0].subject).toBe('Overdue Activity')
    })
  })

  describe('Activity Updates', () => {
    it('should update activity information', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Original Subject',
          note: 'Original note',
          userId: testUser.id,
        },
      })

      // Act
      const updatedActivity = await prisma.activity.update({
        where: { id: activity.id },
        data: {
          type: 'MEETING',
          subject: 'Updated Subject',
          note: 'Updated note',
        },
      })

      // Assert
      expect(updatedActivity.type).toBe('MEETING')
      expect(updatedActivity.subject).toBe('Updated Subject')
      expect(updatedActivity.note).toBe('Updated note')
      expect(updatedActivity.updatedAt.getTime()).toBeGreaterThanOrEqual(activity.updatedAt.getTime())
    })
  })

  describe('Activity Deletion', () => {
    it('should delete an activity', async () => {
      // Arrange
      const testUser = await createTestUser()
      const activity = await prisma.activity.create({
        data: {
          type: 'CALL',
          subject: 'Delete Activity',
          userId: testUser.id,
        },
      })

      // Act
      await prisma.activity.delete({
        where: { id: activity.id },
      })

      // Assert
      const deletedActivity = await prisma.activity.findUnique({
        where: { id: activity.id },
      })
      expect(deletedActivity).toBeNull()
    })
  })
}) 