import { describe, it, expect } from 'vitest';
import {
  PipedriveUser,
  PipedriveLabel,
  PipedriveOrganization,
  WarmLeadTrigger,
  ActivityReplicationTrigger,
  UpdateActivityData,
  UpdatePersonData,
  UpdateOrganizationData,
  UpdateDealData,
  UpdateResult,
  BatchUpdateRequest,
  BatchUpdateResult,
  ValidationResult,
  ConflictResult,
  MergeStrategy,
  ResolutionDecision
} from '@/types/pipedrive';

describe('Pipedrive Types', () => {
  describe('PipedriveUser', () => {
    it('should validate PipedriveUser structure', () => {
      const user: PipedriveUser = {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      expect(user.id).toBeTypeOf('number');
      expect(user.name).toBeTypeOf('string');
      expect(user.email).toBeTypeOf('string');
    });

    it('should allow valid PipedriveUser data', () => {
      const user: PipedriveUser = {
        id: 456,
        name: 'Jane Smith',
        email: 'jane@example.com'
      };
      
      expect(user).toEqual({
        id: 456,
        name: 'Jane Smith',
        email: 'jane@example.com'
      });
    });
  });

  describe('PipedriveLabel', () => {
    it('should validate PipedriveLabel structure', () => {
      const label: PipedriveLabel = {
        id: 1,
        name: 'Warm Lead'
      };
      
      expect(label.id).toBeTypeOf('number');
      expect(label.name).toBeTypeOf('string');
    });
  });

  describe('PipedriveOrganization', () => {
    it('should validate PipedriveOrganization structure', () => {
      const org: PipedriveOrganization = {
        id: 456,
        name: 'Test Corp',
        industry: 'Technology',
        country: 'USA'
      };
      
      expect(org.id).toBeTypeOf('number');
      expect(org.name).toBeTypeOf('string');
      expect(org.industry).toBeTypeOf('string');
      expect(org.country).toBeTypeOf('string');
    });

    it('should allow optional fields', () => {
      const org: PipedriveOrganization = {
        id: 789,
        name: 'Minimal Corp'
      };
      
      expect(org.id).toBe(789);
      expect(org.name).toBe('Minimal Corp');
      expect(org.industry).toBeUndefined();
      expect(org.country).toBeUndefined();
    });
  });

  describe('WarmLeadTrigger', () => {
    it('should validate WarmLeadTrigger structure', () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };
      
      expect(trigger.contactId).toBeTypeOf('string');
      expect(trigger.userId).toBeTypeOf('string');
      expect(trigger.warmnessScore).toBeTypeOf('number');
    });
  });

  describe('ActivityReplicationTrigger', () => {
    it('should validate ActivityReplicationTrigger structure', () => {
      const trigger: ActivityReplicationTrigger = {
        activityId: 'activity-123',
        contactId: 'contact-456',
        userId: 'user-789'
      };
      
      expect(trigger.activityId).toBeTypeOf('string');
      expect(trigger.contactId).toBeTypeOf('string');
      expect(trigger.userId).toBeTypeOf('string');
    });
  });

  describe('UpdateActivityData', () => {
    it('should validate UpdateActivityData structure', () => {
      const updateData: UpdateActivityData = {
        subject: 'Updated subject',
        type: 'email',
        due_date: '2025-12-25',
        due_time: '10:00:00',
        note: 'Updated note',
        person_id: 123,
        user_id: 456,
        done: true
      };
      
      expect(updateData.subject).toBeTypeOf('string');
      expect(updateData.type).toBeTypeOf('string');
      expect(updateData.due_date).toBeTypeOf('string');
      expect(updateData.due_time).toBeTypeOf('string');
      expect(updateData.note).toBeTypeOf('string');
      expect(updateData.person_id).toBeTypeOf('number');
      expect(updateData.user_id).toBeTypeOf('number');
      expect(updateData.done).toBeTypeOf('boolean');
    });

    it('should allow partial updates', () => {
      const updateData: UpdateActivityData = {
        subject: 'Updated subject'
      };
      
      expect(updateData.subject).toBe('Updated subject');
      expect(updateData.type).toBeUndefined();
    });
  });

  describe('UpdatePersonData', () => {
    it('should validate UpdatePersonData structure', () => {
      const updateData: UpdatePersonData = {
        name: 'Updated Name',
        email: ['updated@example.com'],
        phone: ['+1234567890'],
        org_name: 'Updated Corp',
        label_ids: [1, 2, 3],
        owner_id: 123,
        visible_to: 3
      };
      
      expect(updateData.name).toBeTypeOf('string');
      expect(updateData.email).toBeInstanceOf(Array);
      expect(updateData.phone).toBeInstanceOf(Array);
      expect(updateData.org_name).toBeTypeOf('string');
      expect(updateData.label_ids).toBeInstanceOf(Array);
      expect(updateData.owner_id).toBeTypeOf('number');
      expect(updateData.visible_to).toBeTypeOf('number');
    });
  });

  describe('UpdateResult', () => {
    it('should validate UpdateResult structure', () => {
      const result: UpdateResult = {
        success: true,
        recordId: 'record-123',
        error: undefined,
        timestamp: new Date(),
        retryCount: 0
      };
      
      expect(result.success).toBeTypeOf('boolean');
      expect(result.recordId).toBeTypeOf('string');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.retryCount).toBeTypeOf('number');
    });

    it('should handle failed updates', () => {
      const result: UpdateResult = {
        success: false,
        error: 'API Error',
        timestamp: new Date(),
        retryCount: 3
      };
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.retryCount).toBe(3);
    });
  });

  describe('BatchUpdateRequest', () => {
    it('should validate BatchUpdateRequest structure', () => {
      const request: BatchUpdateRequest = {
        recordType: 'activity',
        recordId: 'activity-123',
        data: { subject: 'Updated subject' }
      };
      
      expect(request.recordType).toBe('activity');
      expect(request.recordId).toBeTypeOf('string');
      expect(request.data).toBeTypeOf('object');
    });

    it('should allow all record types', () => {
      const types: Array<BatchUpdateRequest['recordType']> = [
        'activity',
        'person',
        'organization',
        'deal'
      ];
      
      types.forEach(type => {
        const request: BatchUpdateRequest = {
          recordType: type,
          recordId: 'test-id',
          data: {}
        };
        expect(request.recordType).toBe(type);
      });
    });
  });

  describe('BatchUpdateResult', () => {
    it('should validate BatchUpdateResult structure', () => {
      const result: BatchUpdateResult = {
        success: true,
        results: [
          { success: true, recordId: '1', timestamp: new Date(), retryCount: 0 },
          { success: false, error: 'Error', timestamp: new Date(), retryCount: 1 }
        ],
        summary: {
          total: 2,
          successful: 1,
          failed: 1,
          errors: ['Error']
        }
      };
      
      expect(result.success).toBeTypeOf('boolean');
      expect(result.results).toBeInstanceOf(Array);
      expect(result.summary.total).toBeTypeOf('number');
      expect(result.summary.successful).toBeTypeOf('number');
      expect(result.summary.failed).toBeTypeOf('number');
      expect(result.summary.errors).toBeInstanceOf(Array);
    });
  });

  describe('ValidationResult', () => {
    it('should validate ValidationResult structure', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: []
      };
      
      expect(result.isValid).toBeTypeOf('boolean');
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should handle validation errors', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['Invalid email format', 'Missing required field']
      };
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('ConflictResult', () => {
    it('should validate ConflictResult structure', () => {
      const result: ConflictResult = {
        hasConflicts: true,
        conflicts: [
          {
            field: 'name',
            localValue: 'Local Name',
            pipedriveValue: 'Pipedrive Name'
          }
        ]
      };
      
      expect(result.hasConflicts).toBeTypeOf('boolean');
      expect(result.conflicts).toBeInstanceOf(Array);
      expect(result.conflicts[0].field).toBeTypeOf('string');
    });
  });

  describe('MergeStrategy', () => {
    it('should allow all merge strategy types', () => {
      const strategies: MergeStrategy[] = [
        'local-wins',
        'pipedrive-wins',
        'manual',
        'auto-merge'
      ];
      
      strategies.forEach(strategy => {
        expect(strategy).toBeTypeOf('string');
      });
    });
  });

  describe('ResolutionDecision', () => {
    it('should validate ResolutionDecision structure', () => {
      const decision: ResolutionDecision = {
        field: 'name',
        value: 'Resolved Name',
        strategy: 'local-wins'
      };
      
      expect(decision.field).toBeTypeOf('string');
      expect(decision.value).toBeDefined();
      expect(decision.strategy).toBeTypeOf('string');
    });
  });
}); 