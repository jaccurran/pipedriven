import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipedriveUpdateService } from '@/server/services/pipedriveUpdateService';
import { PipedriveService } from '@/server/services/pipedriveService';
import { prisma } from '@/lib/prisma';
import { UpdateActivityData, UpdatePersonData, UpdateOrganizationData, UpdateDealData, BatchUpdateRequest } from '@/types/pipedrive';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      update: vi.fn()
    },
    contact: {
      update: vi.fn()
    },
    organization: {
      update: vi.fn()
    }
  }
}));

describe('PipedriveUpdateService', () => {
  let service: PipedriveUpdateService;
  let mockPipedriveService: any;
  let mockPrismaActivity: any;
  let mockPrismaContact: any;
  let mockPrismaOrganization: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPipedriveService = {
      updateActivity: vi.fn(),
      updatePerson: vi.fn(),
      updateOrganization: vi.fn(),
      updateDeal: vi.fn()
    };
    service = new PipedriveUpdateService(mockPipedriveService);
    
    mockPrismaActivity = vi.mocked(prisma.activity);
    mockPrismaContact = vi.mocked(prisma.contact);
    mockPrismaOrganization = vi.mocked(prisma.organization);
  });

  describe('updateActivity', () => {
    it('should update activity in Pipedrive successfully', async () => {
      const activityId = 'activity-123';
      const updateData: UpdateActivityData = {
        subject: 'Updated Subject',
        note: 'Updated note'
      };

      mockPipedriveService.updateActivity.mockResolvedValue({
        success: true,
        activityId: 789
      });

      mockPrismaActivity.update.mockResolvedValue({
        id: activityId,
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'SYNCED'
      });

      const result = await service.updateActivity(activityId, updateData);

      expect(result.success).toBe(true);
      expect(result.recordId).toBe(activityId);
      expect(result.retryCount).toBe(0);
      expect(mockPipedriveService.updateActivity).toHaveBeenCalledWith(activityId, updateData);
      expect(mockPrismaActivity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: {
          lastPipedriveUpdate: expect.any(Date),
          updateSyncStatus: 'SYNCED'
        }
      });
    });

    it('should handle update conflicts with retry logic', async () => {
      const activityId = 'activity-123';
      const updateData: UpdateActivityData = {
        subject: 'Updated Subject'
      };

      // Mock failure then success
      mockPipedriveService.updateActivity
        .mockRejectedValueOnce(new Error('Conflict: Record modified by another user'))
        .mockResolvedValueOnce({ success: true, activityId: 789 });

      mockPrismaActivity.update.mockResolvedValue({
        id: activityId,
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'SYNCED'
      });

      const result = await service.updateActivity(activityId, updateData);

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(mockPipedriveService.updateActivity).toHaveBeenCalledTimes(2);
    });

    it('should handle permanent failures after max retries', async () => {
      const activityId = 'activity-123';
      const updateData: UpdateActivityData = {
        subject: 'Updated Subject'
      };

      mockPipedriveService.updateActivity.mockRejectedValue(
        new Error('API Error')
      );

      mockPrismaActivity.update.mockResolvedValue({
        id: activityId,
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'FAILED'
      });

      const result = await service.updateActivity(activityId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.retryCount).toBe(3);
      expect(mockPipedriveService.updateActivity).toHaveBeenCalledTimes(3);
      expect(mockPrismaActivity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: {
          lastPipedriveUpdate: expect.any(Date),
          updateSyncStatus: 'FAILED'
        }
      });
    });
  });

  describe('updatePerson', () => {
    it('should update person in Pipedrive successfully', async () => {
      const personId = 'person-123';
      const updateData: UpdatePersonData = {
        name: 'Updated Name',
        email: ['updated@example.com']
      };

      mockPipedriveService.updatePerson.mockResolvedValue({
        success: true,
        personId: 456
      });

      mockPrismaContact.update.mockResolvedValue({
        pipedrivePersonId: personId,
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'SYNCED'
      });

      const result = await service.updatePerson(personId, updateData);

      expect(result.success).toBe(true);
      expect(result.recordId).toBe(personId);
      expect(result.retryCount).toBe(0);
      expect(mockPipedriveService.updatePerson).toHaveBeenCalledWith(personId, updateData);
      expect(mockPrismaContact.update).toHaveBeenCalledWith({
        where: { pipedrivePersonId: personId },
        data: {
          lastPipedriveUpdate: expect.any(Date),
          updateSyncStatus: 'SYNCED'
        }
      });
    });

    it('should handle person update conflicts', async () => {
      const personId = 'person-123';
      const updateData: UpdatePersonData = {
        name: 'Updated Name'
      };

      mockPipedriveService.updatePerson.mockRejectedValue(
        new Error('Conflict: Record modified by another user')
      );

      mockPrismaContact.update.mockResolvedValue({
        pipedrivePersonId: personId,
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'FAILED'
      });

      const result = await service.updatePerson(personId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflict');
      expect(result.retryCount).toBe(3);
    });
  });

  describe('updateOrganization', () => {
    it('should update organization in Pipedrive successfully', async () => {
      const orgId = 'org-123';
      const updateData: UpdateOrganizationData = {
        name: 'Updated Organization',
        industry: 'Technology'
      };

      mockPipedriveService.updateOrganization.mockResolvedValue({
        success: true,
        organizationId: 789
      });

      mockPrismaOrganization.update.mockResolvedValue({
        pipedriveOrgId: orgId,
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'SYNCED'
      });

      const result = await service.updateOrganization(orgId, updateData);

      expect(result.success).toBe(true);
      expect(result.recordId).toBe(orgId);
      expect(mockPipedriveService.updateOrganization).toHaveBeenCalledWith(orgId, updateData);
    });
  });

  describe('updateDeal', () => {
    it('should update deal in Pipedrive successfully', async () => {
      const dealId = 'deal-123';
      const updateData: UpdateDealData = {
        title: 'Updated Deal',
        value: 50000
      };

      mockPipedriveService.updateDeal.mockResolvedValue({
        success: true,
        dealId: 456
      });

      const result = await service.updateDeal(dealId, updateData);

      expect(result.success).toBe(true);
      expect(result.recordId).toBe(dealId);
      expect(mockPipedriveService.updateDeal).toHaveBeenCalledWith(dealId, updateData);
    });
  });

  describe('batchUpdate', () => {
    it('should process multiple updates successfully', async () => {
      const updates: BatchUpdateRequest[] = [
        { recordType: 'activity', recordId: 'act-1', data: { subject: 'Update 1' } },
        { recordType: 'person', recordId: 'person-1', data: { name: 'Update 2' } },
        { recordType: 'organization', recordId: 'org-1', data: { name: 'Update 3' } }
      ];

      mockPipedriveService.updateActivity.mockResolvedValue({ success: true, activityId: 1 });
      mockPipedriveService.updatePerson.mockResolvedValue({ success: true, personId: 2 });
      mockPipedriveService.updateOrganization.mockResolvedValue({ success: true, organizationId: 3 });

      mockPrismaActivity.update.mockResolvedValue({ id: 'act-1', updateSyncStatus: 'SYNCED' });
      mockPrismaContact.update.mockResolvedValue({ pipedrivePersonId: 'person-1', updateSyncStatus: 'SYNCED' });
      mockPrismaOrganization.update.mockResolvedValue({ pipedriveOrgId: 'org-1', updateSyncStatus: 'SYNCED' });

      const result = await service.batchUpdate(updates);

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should handle partial failures in batch', async () => {
      const updates: BatchUpdateRequest[] = [
        { recordType: 'activity', recordId: 'act-1', data: { subject: 'Update 1' } },
        { recordType: 'person', recordId: 'person-1', data: { name: 'Update 2' } }
      ];

      mockPipedriveService.updateActivity.mockResolvedValue({ success: true, activityId: 1 });
      mockPipedriveService.updatePerson.mockRejectedValue(new Error('API Error'));

      mockPrismaActivity.update.mockResolvedValue({ id: 'act-1', updateSyncStatus: 'SYNCED' });
      mockPrismaContact.update.mockResolvedValue({ pipedrivePersonId: 'person-1', updateSyncStatus: 'FAILED' });

      const result = await service.batchUpdate(updates);

      expect(result.success).toBe(false);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.errors).toContain('API Error');
    });

    it('should handle unsupported record types', async () => {
      const updates: BatchUpdateRequest[] = [
        { recordType: 'unsupported' as any, recordId: 'test-1', data: {} }
      ];

      const result = await service.batchUpdate(updates);

      expect(result.success).toBe(false);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.errors).toContain('Unsupported record type: unsupported');
    });

    it('should respect rate limiting between batches', async () => {
      const updates: BatchUpdateRequest[] = Array.from({ length: 25 }, (_, i) => ({
        recordType: 'activity' as const,
        recordId: `act-${i}`,
        data: { subject: `Update ${i}` }
      }));

      mockPipedriveService.updateActivity.mockResolvedValue({ success: true, activityId: 1 });
      mockPrismaActivity.update.mockResolvedValue({ id: 'act-1', updateSyncStatus: 'SYNCED' });

      const startTime = Date.now();
      const result = await service.batchUpdate(updates);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(25);
      expect(result.summary.successful).toBe(25);
      
      // Should have rate limiting delays (3 batches of 10, 10, 5 with 1s delays)
      expect(endTime - startTime).toBeGreaterThan(2000); // At least 2 seconds for delays
    });
  });

  describe('processUpdate', () => {
    it('should route updates to correct service methods', async () => {
      const activityUpdate = { recordType: 'activity', recordId: 'act-1', data: { subject: 'Test' } };
      const personUpdate = { recordType: 'person', recordId: 'person-1', data: { name: 'Test' } };
      const orgUpdate = { recordType: 'organization', recordId: 'org-1', data: { name: 'Test' } };
      const dealUpdate = { recordType: 'deal', recordId: 'deal-1', data: { title: 'Test' } };

      mockPipedriveService.updateActivity.mockResolvedValue({ success: true });
      mockPipedriveService.updatePerson.mockResolvedValue({ success: true });
      mockPipedriveService.updateOrganization.mockResolvedValue({ success: true });
      mockPipedriveService.updateDeal.mockResolvedValue({ success: true });

      await service['processUpdate'](activityUpdate);
      await service['processUpdate'](personUpdate);
      await service['processUpdate'](orgUpdate);
      await service['processUpdate'](dealUpdate);

      expect(mockPipedriveService.updateActivity).toHaveBeenCalledWith('act-1', { subject: 'Test' });
      expect(mockPipedriveService.updatePerson).toHaveBeenCalledWith('person-1', { name: 'Test' });
      expect(mockPipedriveService.updateOrganization).toHaveBeenCalledWith('org-1', { name: 'Test' });
      expect(mockPipedriveService.updateDeal).toHaveBeenCalledWith('deal-1', { title: 'Test' });
    });
  });
}); 