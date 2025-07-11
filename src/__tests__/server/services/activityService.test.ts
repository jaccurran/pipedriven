// Mock the Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ActivityService } from '@/server/services/activityService'
import { prisma } from '@/lib/prisma'
import type { Activity, ActivityType, Contact, User } from '@prisma/client'

const mockPrisma = vi.mocked(prisma)

describe('ActivityService', () => {
  let activityService: ActivityService
  let mockUser: User
  let mockContact: Contact
  let mockActivity: Activity

  beforeEach(() => {
    activityService = new ActivityService()
    
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'CONSULTANT',
      pipedriveApiKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: null,
      image: null,
    } as User

    mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      organisation: 'Acme Corp',
      warmnessScore: 5,
      lastContacted: new Date('2024-01-15'),
      addedToCampaign: true,
      pipedrivePersonId: 'pipedrive-person-123',
      pipedriveOrgId: 'pipedrive-org-456',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: mockUser.id,
    } as Contact

    mockActivity = {
      id: 'activity-123',
      type: 'EMAIL' as ActivityType,
      subject: 'Follow-up Email',
      note: 'Contact responded positively',
      dueDate: new Date('2024-01-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
      contactId: mockContact.id,
      campaignId: null,
      userId: mockUser.id,
    } as Activity;

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createActivity', () => {
    it('should create activity successfully', async () => {
      // Arrange
      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: new Date('2024-01-15'),
        contactId: mockContact.id,
        userId: mockUser.id,
      };

      (mockPrisma.activity.create as any).mockResolvedValue(mockActivity);
      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact);
      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);

      // Act
      const result = await activityService.createActivity(activityData);

      // Assert
      expect(result).toEqual(mockActivity);
      expect(mockPrisma.activity.create).toHaveBeenCalledWith({
        data: activityData,
        include: {
          contact: true,
          user: true,
        },
      });
    });

    it('should throw error when contact not found', async () => {
      // Arrange
      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: new Date('2024-01-15'),
        contactId: 'non-existent-contact',
        userId: mockUser.id,
      };

      (mockPrisma.contact.findUnique as any).mockResolvedValue(null);

      // Act & Assert
      await expect(activityService.createActivity(activityData)).rejects.toThrow('Contact not found');
      expect(mockPrisma.activity.create).not.toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: new Date('2024-01-15'),
        contactId: mockContact.id,
        userId: 'non-existent-user',
      };

      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact);
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      // Act & Assert
      await expect(activityService.createActivity(activityData)).rejects.toThrow('User not found');
      expect(mockPrisma.activity.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const activityData = {
        type: 'EMAIL' as ActivityType,
        subject: 'Follow-up Email',
        note: 'Contact responded positively',
        dueDate: new Date('2024-01-15'),
        contactId: mockContact.id,
        userId: mockUser.id,
      };

      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact);
      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      (mockPrisma.activity.create as any).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(activityService.createActivity(activityData)).rejects.toThrow('Database error');
    });
  })

  describe('getActivities', () => {
    it('should return activities with default pagination', async () => {
      // Arrange
      const mockActivities = [mockActivity];
      (mockPrisma.activity.findMany as any).mockResolvedValue(mockActivities);
      (mockPrisma.activity.count as any).mockResolvedValue(1);

      // Act
      const result = await activityService.getActivities({ userId: mockUser.id })

      // Assert
      expect(result.activities).toEqual(mockActivities)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        include: { contact: true, user: true },
        orderBy: { date: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('should apply filters correctly', async () => {
      // Arrange
      const mockActivities = [mockActivity];
      (mockPrisma.activity.findMany as any).mockResolvedValue(mockActivities);
      (mockPrisma.activity.count as any).mockResolvedValue(1);

      const filters = {
        userId: mockUser.id,
        type: 'EMAIL' as ActivityType,
        outcome: 'POSITIVE' as const,
        contactId: mockContact.id,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      };

      // Act
      const result = await activityService.getActivities(filters);

      // Assert
      expect(result.activities).toEqual(mockActivities);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          type: 'EMAIL',
          outcome: 'POSITIVE',
          contactId: mockContact.id,
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        include: { contact: true, user: true },
        orderBy: { date: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const mockActivities = [mockActivity];
      (mockPrisma.activity.findMany as any).mockResolvedValue(mockActivities);
      (mockPrisma.activity.count as any).mockResolvedValue(25);

      // Act
      const result = await activityService.getActivities({
        userId: mockUser.id,
        page: 2,
        limit: 5,
      });

      // Assert
      expect(result.activities).toEqual(mockActivities);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        include: { contact: true, user: true },
        orderBy: { date: 'desc' },
        skip: 5,
        take: 5,
      });
    });
  })

  describe('getActivityById', () => {
    it('should return activity by ID', async () => {
      // Arrange
      (mockPrisma.activity.findUnique as any).mockResolvedValue(mockActivity)

      // Act
      const result = await activityService.getActivityById('activity-123')

      // Assert
      expect(result).toEqual(mockActivity)
      expect(mockPrisma.activity.findUnique).toHaveBeenCalledWith({
        where: { id: 'activity-123' },
        include: { contact: true, user: true },
      })
    })

    it('should return null when activity not found', async () => {
      // Arrange
      (mockPrisma.activity.findUnique as any).mockResolvedValue(null)

      // Act
      const result = await activityService.getActivityById('non-existent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('updateActivity', () => {
    it('should update activity successfully', async () => {
      // Arrange
      const updateData = {
        subject: 'Updated Subject',
        description: 'Updated description',
        outcome: 'NEGATIVE' as const,
      };

      const updatedActivity = { ...mockActivity, ...updateData };
      (mockPrisma.activity.findUnique as any).mockResolvedValue(mockActivity);
      (mockPrisma.activity.update as any).mockResolvedValue(updatedActivity);

      // Act
      const result = await activityService.updateActivity('activity-123', updateData);

      // Assert
      expect(result).toEqual(updatedActivity);
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-123' },
        data: updateData,
        include: { contact: true, user: true },
      });
    });

    it('should throw error when activity not found', async () => {
      // Arrange
      const updateData = { subject: 'Updated Subject' };
      (mockPrisma.activity.findUnique as any).mockResolvedValue(null);

      // Act & Assert
      await expect(activityService.updateActivity('non-existent', updateData)).rejects.toThrow('Activity not found');
      expect(mockPrisma.activity.update).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const updateData = { subject: 'Updated Subject' };
      (mockPrisma.activity.findUnique as any).mockResolvedValue(mockActivity);
      (mockPrisma.activity.update as any).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(activityService.updateActivity('activity-123', updateData)).rejects.toThrow('Database error');
    });
  })

  describe('deleteActivity', () => {
    it('should delete activity successfully', async () => {
      // Arrange
      (mockPrisma.activity.findUnique as any).mockResolvedValue(mockActivity)
      (mockPrisma.activity.delete as any).mockResolvedValue(mockActivity)

      // Act
      const result = await activityService.deleteActivity('activity-123')

      // Assert
      expect(result).toEqual(mockActivity)
      expect(mockPrisma.activity.delete).toHaveBeenCalledWith({
        where: { id: 'activity-123' },
      })
    })

    it('should throw error when activity not found', async () => {
      // Arrange
      (mockPrisma.activity.findUnique as any).mockResolvedValue(null)

      // Act & Assert
      await expect(activityService.deleteActivity('non-existent')).rejects.toThrow('Activity not found')
      expect(mockPrisma.activity.delete).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      (mockPrisma.activity.findUnique as any).mockResolvedValue(mockActivity)
      (mockPrisma.activity.delete as any).mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(activityService.deleteActivity('activity-123')).rejects.toThrow('Database error')
    })
  })

  describe('getActivityAnalytics', () => {
    it('should return activity analytics', async () => {
      // Arrange
      (mockPrisma.activity.count as any).mockResolvedValue(15)

      // Mock the complex analytics queries
      (mockPrisma.activity.groupBy as any).mockResolvedValueOnce([
        { type: 'EMAIL', _count: { type: 5 } },
        { type: 'CALL', _count: { type: 3 } },
        { type: 'MEETING', _count: { type: 2 } },
        { type: 'LINKEDIN', _count: { type: 2 } },
        { type: 'REFERRAL', _count: { type: 2 } },
        { type: 'CONFERENCE', _count: { type: 1 } },
      ])

      (mockPrisma.activity.groupBy as any).mockResolvedValueOnce([
        { outcome: 'POSITIVE', _count: { outcome: 8 } },
        { outcome: 'NEUTRAL', _count: { outcome: 4 } },
        { outcome: 'NEGATIVE', _count: { outcome: 3 } },
      ])

      (mockPrisma.activity.groupBy as any).mockResolvedValueOnce([
        { contactId: mockContact.id, _count: { contactId: 5 } },
      ])

      (mockPrisma.activity.groupBy as any).mockResolvedValueOnce([
        { date: new Date('2024-01-15'), _count: { date: 3 } },
        { date: new Date('2024-01-14'), _count: { date: 2 } },
        { date: new Date('2024-01-13'), _count: { date: 1 } },
      ])

      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact)

      // Act
      const result = await activityService.getActivityAnalytics({ userId: mockUser.id })

      // Assert
      expect(result.totalActivities).toBe(15);
      expect(result.activityBreakdown).toBeDefined();
      expect(result.averageActivitiesPerContact).toBeDefined();
      expect(result.mostActiveContact).toBeDefined();
      expect(result.recentActivityTrend).toBeDefined();
    })

    it('should handle empty analytics gracefully', async () => {
      // Arrange
      (mockPrisma.activity.count as any).mockResolvedValue(0)
      (mockPrisma.activity.groupBy as any).mockResolvedValue([])

      // Act
      const result = await activityService.getActivityAnalytics({ userId: mockUser.id })

      // Assert
      expect(result.totalActivities).toBe(0);
      expect(result.activityBreakdown).toEqual({
        EMAIL: 0,
        CALL: 0,
        MEETING: 0,
        LINKEDIN: 0,
        REFERRAL: 0,
        CONFERENCE: 0,
      });
      expect(result.averageActivitiesPerContact).toBe(0);
      expect(result.mostActiveContact).toBeNull();
      expect(result.recentActivityTrend).toEqual([]);
    })
  })
}) 