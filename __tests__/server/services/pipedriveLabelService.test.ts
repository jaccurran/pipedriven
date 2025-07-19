import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipedriveLabelService } from '@/server/services/pipedriveLabelService';

describe('PipedriveLabelService', () => {
  let service: PipedriveLabelService;
  let mockPipedriveService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPipedriveService = {
      getPersonCustomFields: vi.fn()
    };
    service = new PipedriveLabelService(mockPipedriveService);
  });

  describe('findOrCreateLabel', () => {
    it('should find existing label option by name', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: [
              { id: 1, label: 'Warm Lead', value: 'warm_lead' },
              { id: 2, label: 'Cold Lead', value: 'cold_lead' },
              { id: 3, label: 'Hot Lead', value: 'hot_lead' }
            ]
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      const result = await service.findOrCreateLabel('Warm Lead');

      expect(result).toBe(1);
      expect(mockPipedriveService.getPersonCustomFields).toHaveBeenCalled();
    });

    it('should use first available option if label not found', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: [
              { id: 1, label: 'Cold Lead', value: 'cold_lead' },
              { id: 2, label: 'Hot Lead', value: 'hot_lead' }
            ]
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      const result = await service.findOrCreateLabel('Warm Lead');

      expect(result).toBe(1); // Should use first available option
    });

    it('should handle case-insensitive label matching', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: [
              { id: 1, label: 'Warm Lead', value: 'warm_lead' },
              { id: 2, label: 'COLD LEAD', value: 'cold_lead' },
              { id: 3, label: 'Hot Lead', value: 'hot_lead' }
            ]
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      const result = await service.findOrCreateLabel('cold lead');

      expect(result).toBe(2);
    });

    it('should handle API errors when fetching custom fields', async () => {
      mockPipedriveService.getPersonCustomFields.mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        service.findOrCreateLabel('Test Label')
      ).rejects.toThrow('API Error');
    });

    it('should handle failed custom fields response', async () => {
      mockPipedriveService.getPersonCustomFields.mockResolvedValue({
        success: false,
        error: 'Failed to fetch custom fields'
      });

      await expect(
        service.findOrCreateLabel('Test Label')
      ).rejects.toThrow('Failed to fetch custom fields');
    });

    it('should handle no suitable label field found', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Phone Number',
            key: 'phone_field',
            field_type: 'text'
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      await expect(
        service.findOrCreateLabel('Test Label')
      ).rejects.toThrow('No label field found');
    });

    it('should handle label field with no options', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: []
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      await expect(
        service.findOrCreateLabel('Test Label')
      ).rejects.toThrow('No label options available');
    });
  });

  describe('getWarmLeadLabelId', () => {
    it('should return warm lead label ID', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: [
              { id: 1, label: 'Warm Lead', value: 'warm_lead' },
              { id: 2, label: 'Cold Lead', value: 'cold_lead' }
            ]
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      const result = await service.getWarmLeadLabelId();

      expect(result).toBe(1);
    });

    it('should use first available option if warm lead not found', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: [
              { id: 1, label: 'Cold Lead', value: 'cold_lead' },
              { id: 2, label: 'Hot Lead', value: 'hot_lead' }
            ]
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      const result = await service.getWarmLeadLabelId();

      expect(result).toBe(1); // Should use first available option
    });
  });

  describe('getLabelFieldKey', () => {
    it('should return label field key', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: [
              { id: 1, label: 'Warm Lead', value: 'warm_lead' }
            ]
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      const result = await service.getLabelFieldKey();

      expect(result).toBe('label_field');
    });

    it('should return null if no label field found', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Phone Number',
            key: 'phone_field',
            field_type: 'text'
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      const result = await service.getLabelFieldKey();

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      mockPipedriveService.getPersonCustomFields.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.getLabelFieldKey();

      expect(result).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple label operations', async () => {
      const mockCustomFieldsResponse = {
        success: true,
        fields: [
          {
            id: 1,
            name: 'Label',
            key: 'label_field',
            field_type: 'enum',
            options: [
              { id: 1, label: 'Warm Lead', value: 'warm_lead' },
              { id: 2, label: 'Cold Lead', value: 'cold_lead' }
            ]
          }
        ]
      };
      
      mockPipedriveService.getPersonCustomFields.mockResolvedValue(mockCustomFieldsResponse);

      // Get existing label
      const warmLeadId = await service.getWarmLeadLabelId();
      expect(warmLeadId).toBe(1);

      // Get label field key
      const labelFieldKey = await service.getLabelFieldKey();
      expect(labelFieldKey).toBe('label_field');

      // Find specific label
      const coldLeadId = await service.findOrCreateLabel('Cold Lead');
      expect(coldLeadId).toBe(2);
    });
  });
}); 