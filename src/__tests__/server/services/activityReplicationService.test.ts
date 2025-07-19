import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityReplicationService, ActivityReplicationTrigger } from '@/server/services/activityReplicationService';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

// Mock PipedriveService
vi.mock('@/server/services/pipedriveService', () => ({
  PipedriveService: vi.fn().mockImplementation(() => ({
    createActivity: vi.fn()
  }))
}));

describe('ActivityReplicationService', () => {
  let service: ActivityReplicationService;
  let mockPipedriveService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPipedriveService = {
      createActivity: vi.fn()
    };

    service = new ActivityReplicationService(mockPipedriveService);
  });

  describe('replicateActivity', () => {
    it('should replicate activity for contact with Pipedrive ID', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        type: 'EMAIL',
        subject: 'Follow up email',
        note: 'Important follow up',
        dueDate: new Date('2024-12-25T10:00:00Z'),
        contact: {
          pipedrivePersonId: '123',
          name: 'John Doe',
          organisation: 'Test Corp',
          organization: {
            pipedriveOrgId: '456'
          }
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: {
          name: 'Test Campaign',
          shortcode: 'TEST'
        }
      };

      const mockUser = {
        id: 'user-789',
        pipedriveUserId: 456
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockPipedriveService.createActivity.mockResolvedValue({
        success: true,
        activityId: 789
      });

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(true);
      expect(mockPipedriveService.createActivity).toHaveBeenCalledWith({
        ...mockActivity,
        contact: {
          ...mockActivity.contact,
          pipedriveOrgId: '456',
          name: 'John Doe',
          organisation: 'Test Corp'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: {
          name: 'Test Campaign',
          shortcode: 'TEST'
        }
      });
      expect(prisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-123' },
        data: {
          pipedriveActivityId: 789,
          replicatedToPipedrive: true,
          pipedriveSyncAttempts: 1,
          lastPipedriveSyncAttempt: expect.any(Date)
        }
      });
    });

    it('should not replicate activity for contact without Pipedrive ID', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        contact: {
          pipedrivePersonId: null
        }
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(false);
      expect(mockPipedriveService.createActivity).not.toHaveBeenCalled();
    });

    it('should handle retry logic on failure', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        type: 'EMAIL',
        subject: 'Test',
        contact: {
          pipedrivePersonId: '123',
          name: 'John Doe',
          organisation: 'Test Corp'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      const mockUser = {
        id: 'user-789',
        pipedriveUserId: 456
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Mock failure then success
      mockPipedriveService.createActivity
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ success: true, activityId: 789 });

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(true);
      expect(mockPipedriveService.createActivity).toHaveBeenCalledTimes(2);
      expect(prisma.activity.update).toHaveBeenCalledTimes(2);
    });

    it('should handle user not found', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        type: 'EMAIL',
        subject: 'Test',
        contact: {
          pipedrivePersonId: '123',
          name: 'John Doe',
          organisation: 'Test Corp'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(false);
      expect(mockPipedriveService.createActivity).not.toHaveBeenCalled();
    });

    it('should handle activity not found', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

      const result = await service.replicateActivity(trigger);

      expect(result).toBe(false);
      expect(mockPipedriveService.createActivity).not.toHaveBeenCalled();
    });

    it('should handle activities without due date', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        type: 'EMAIL',
        subject: 'Test email',
        note: 'Test note',
        dueDate: null,
        contact: {
          pipedrivePersonId: '123',
          name: 'John Doe',
          organisation: 'Test Corp'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      const mockUser = {
        id: 'user-789',
        pipedriveUserId: 456
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockPipedriveService.createActivity.mockResolvedValue({
        success: true,
        activityId: 789
      });

      await service.replicateActivity(trigger);

      expect(mockPipedriveService.createActivity).toHaveBeenCalledWith({
        ...mockActivity,
        contact: {
          ...mockActivity.contact,
          pipedriveOrgId: undefined,
          name: 'John Doe',
          organisation: 'Test Corp'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: undefined
      });
    });

    it('should handle user without Pipedrive user ID', async () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };

      const mockActivity = {
        id: 'activity-123',
        type: 'EMAIL',
        subject: 'Test email',
        contact: {
          pipedrivePersonId: '123',
          name: 'John Doe',
          organisation: 'Test Corp'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      const mockUser = {
        id: 'user-789',
        pipedriveUserId: null
      };

      vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockPipedriveService.createActivity.mockResolvedValue({
        success: true,
        activityId: 789
      });

      await service.replicateActivity(trigger);

      expect(mockPipedriveService.createActivity).toHaveBeenCalledWith({
        ...mockActivity,
        contact: {
          ...mockActivity.contact,
          pipedriveOrgId: undefined,
          name: 'John Doe',
          organisation: 'Test Corp'
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        campaign: undefined
      });
    });
  });
}); 