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
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn()
  },
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ActivityService } from '@/server/services/activityService'
import { ActivityReplicationService } from '@/server/services/activityReplicationService';
import { prisma } from '@/lib/prisma'
import type { Activity, ActivityType, Contact, User } from '@prisma/client'

const mockPrisma = vi.mocked(prisma)

describe('ActivityService', () => {
  let activityService: ActivityService
  let mockUser: User
  let mockContact: Contact
  let mockActivity: Activity
  let mockReplicationService: any;
  let mockTransaction: any;

  beforeEach(() => {
    mockReplicationService = {
      replicateActivity: vi.fn()
    };
    mockTransaction = vi.mocked(prisma.$transaction);
    
    activityService = new ActivityService(mockReplicationService)
    
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

      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact);
      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          activity: {
            create: vi.fn().mockResolvedValue(mockActivity)
          },
          contact: {
            update: vi.fn()
          }
        });
      });

      // Act
      const result = await activityService.createActivity(activityData);

      // Assert
      expect(result).toEqual(mockActivity);
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
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          activity: {
            create: vi.fn().mockRejectedValue(new Error('Database error'))
          },
          contact: {
            update: vi.fn()
          }
        });
      });

      // Act & Assert
      await expect(activityService.createActivity(activityData)).rejects.toThrow('Database error');
    });
  })

  describe('createActivity with replication', () => {
    it('should replicate activity when contact has Pipedrive ID', async () => {
      const createData = {
        type: 'EMAIL' as const,
        subject: 'Test email',
        contactId: 'contact-123',
        userId: 'user-456'
      };

      const mockContact = {
        id: 'contact-123',
        pipedrivePersonId: '789'
      };

      const mockUser = {
        id: 'user-456'
      };

      const mockActivity = {
        id: 'activity-789',
        ...createData
      };

      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact as any);
      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser as any);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          activity: {
            create: vi.fn().mockResolvedValue(mockActivity)
          },
          contact: {
            update: vi.fn()
          }
        });
      });

      (mockReplicationService.replicateActivity as any).mockResolvedValue(true);

      const result = await activityService.createActivity(createData);

      expect(result).toEqual(mockActivity);
      expect(mockReplicationService.replicateActivity).toHaveBeenCalledWith({
        activityId: 'activity-789',
        contactId: 'contact-123',
        userId: 'user-456'
      });
    });

    it('should not replicate activity when no contact ID provided', async () => {
      const createData = {
        type: 'EMAIL' as const,
        subject: 'Test email',
        userId: 'user-456'
        // No contactId
      };

      const mockUser = {
        id: 'user-456'
      };

      const mockActivity = {
        id: 'activity-789',
        ...createData
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser as any);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          activity: {
            create: vi.fn().mockResolvedValue(mockActivity)
          }
        });
      });

      const result = await activityService.createActivity(createData);

      expect(result).toEqual(mockActivity);
      expect(mockReplicationService.replicateActivity).not.toHaveBeenCalled();
    });

    it('should not fail activity creation when replication fails', async () => {
      const createData = {
        type: 'EMAIL' as const,
        subject: 'Test email',
        contactId: 'contact-123',
        userId: 'user-456'
      };

      const mockContact = {
        id: 'contact-123',
        pipedrivePersonId: '789'
      };

      const mockUser = {
        id: 'user-456'
      };

      const mockActivity = {
        id: 'activity-789',
        ...createData
      };

      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact as any);
      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser as any);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          activity: {
            create: vi.fn().mockResolvedValue(mockActivity)
          },
          contact: {
            update: vi.fn()
          }
        });
      });

      (mockReplicationService.replicateActivity as any).mockRejectedValue(new Error('Replication failed'));

      const result = await activityService.createActivity(createData);

      expect(result).toEqual(mockActivity);
      expect(mockReplicationService.replicateActivity).toHaveBeenCalled();
    });

    it('should work without replication service', async () => {
      const serviceWithoutReplication = new ActivityService();
      const createData = {
        type: 'EMAIL' as const,
        subject: 'Test email',
        contactId: 'contact-123',
        userId: 'user-456'
      };

      const mockContact = {
        id: 'contact-123',
        pipedrivePersonId: '789'
      };

      const mockUser = {
        id: 'user-456'
      };

      const mockActivity = {
        id: 'activity-789',
        ...createData
      };

      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact as any);
      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser as any);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          activity: {
            create: vi.fn().mockResolvedValue(mockActivity)
          },
          contact: {
            update: vi.fn()
          }
        });
      });

      const result = await serviceWithoutReplication.createActivity(createData);

      expect(result).toEqual(mockActivity);
      // Should not throw any errors
    });
  });

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
        include: { contact: true, user: true, campaign: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('should apply filters correctly', async () => {
      // Arrange
      const mockActivities = [mockActivity];
      const filters = {
        userId: mockUser.id,
        type: 'EMAIL' as ActivityType,
        contactId: mockContact.id,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      };

      (mockPrisma.activity.findMany as any).mockResolvedValue(mockActivities);
      (mockPrisma.activity.count as any).mockResolvedValue(1);

      // Act
      const result = await activityService.getActivities(filters)

      // Assert
      expect(result.activities).toEqual(mockActivities);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          type: 'EMAIL',
          contactId: mockContact.id,
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        include: { contact: true, user: true, campaign: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('should handle pagination correctly', async () => {
      // Arrange
      const mockActivities = [mockActivity];
      (mockPrisma.activity.findMany as any).mockResolvedValue(mockActivities);
      (mockPrisma.activity.count as any).mockResolvedValue(25);

      // Act
      const result = await activityService.getActivities({ 
        userId: mockUser.id, 
        page: 2, 
        limit: 5 
      })

      // Assert
      expect(result.activities).toEqual(mockActivities);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        include: { contact: true, user: true, campaign: true },
        orderBy: { createdAt: 'desc' },
        skip: 5,
        take: 5,
      })
    })
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
        include: { contact: true, user: true, campaign: true },
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
        note: 'Updated description',
        type: 'CALL' as ActivityType,
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
        include: { contact: true, user: true, campaign: true },
      })
    })

    it('should throw error when activity not found', async () => {
      // Arrange
      const updateData = { subject: 'Updated Subject' };
      (mockPrisma.activity.findUnique as any).mockResolvedValue(null);

      // Act & Assert
      await expect(activityService.updateActivity('non-existent', updateData)).rejects.toThrow('Activity not found');
      expect(mockPrisma.activity.update).not.toHaveBeenCalled();
    })
  })

  describe('deleteActivity', () => {
    it('should delete activity successfully', async () => {
      // Arrange
      (mockPrisma.activity.findUnique as any).mockResolvedValue(mockActivity);
      (mockPrisma.activity.delete as any).mockResolvedValue(mockActivity);

      // Act
      const result = await activityService.deleteActivity('activity-123');

      // Assert
      expect(result).toEqual(mockActivity);
      expect(mockPrisma.activity.delete).toHaveBeenCalledWith({
        where: { id: 'activity-123' },
      });
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      (mockPrisma.activity.findUnique as any).mockResolvedValue(mockActivity);
      (mockPrisma.activity.delete as any).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(activityService.deleteActivity('activity-123')).rejects.toThrow('Database error');
    })
  })

  describe('getActivityAnalytics', () => {
    it('should return activity analytics', async () => {
      // Arrange
      const mockGroupByResult = [
        { type: 'EMAIL', _count: { type: 5 } },
        { type: 'CALL', _count: { type: 3 } },
        { type: 'MEETING', _count: { type: 2 } },
      ];
      const mockContactActivityCounts = [
        { contactId: 'contact-1', _count: { contactId: 3 } },
        { contactId: 'contact-2', _count: { contactId: 2 } },
      ];
      const mockRecentActivityTrend = [
        { createdAt: new Date('2024-01-15'), _count: { createdAt: 2 } },
        { createdAt: new Date('2024-01-14'), _count: { createdAt: 1 } },
      ];

      (mockPrisma.activity.count as any).mockResolvedValue(10);
      (mockPrisma.activity.groupBy as any)
        .mockResolvedValueOnce(mockGroupByResult) // First call for activity breakdown
        .mockResolvedValueOnce(mockContactActivityCounts) // Second call for contact activity counts
        .mockResolvedValueOnce(mockRecentActivityTrend); // Third call for recent activity trend
      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContact);

      // Act
      const result = await activityService.getActivityAnalytics({ userId: mockUser.id });

      // Assert
      expect(result.totalActivities).toBe(10);
      expect(result.activityBreakdown).toEqual({
        CALL: 3,
        EMAIL: 5,
        MEETING: 2,
        LINKEDIN: 0,
        REFERRAL: 0,
        CONFERENCE: 0,
      });
      expect(result.averageActivitiesPerContact).toBe(2.5);
      expect(result.mostActiveContact).toEqual(mockContact);
      expect(result.recentActivityTrend).toEqual([
        { date: '2024-01-15', count: 2 },
        { date: '2024-01-14', count: 1 },
      ]);
    })

    it('should handle empty analytics gracefully', async () => {
      // Arrange
      (mockPrisma.activity.count as any).mockResolvedValue(0);
      (mockPrisma.activity.groupBy as any)
        .mockResolvedValueOnce([]) // Empty activity breakdown
        .mockResolvedValueOnce([]) // Empty contact activity counts
        .mockResolvedValueOnce([]); // Empty recent activity trend

      // Act
      const result = await activityService.getActivityAnalytics({ userId: mockUser.id });

      // Assert
      expect(result.totalActivities).toBe(0);
      expect(result.activityBreakdown).toEqual({
        CALL: 0,
        EMAIL: 0,
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