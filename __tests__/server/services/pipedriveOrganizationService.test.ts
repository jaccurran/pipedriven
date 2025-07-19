import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipedriveOrganizationService } from '@/server/services/pipedriveOrganizationService';
import { PipedriveOrganization } from '@/types/pipedrive';

describe('PipedriveOrganizationService', () => {
  let service: PipedriveOrganizationService;
  let mockPipedriveService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPipedriveService = {
      createOrganization: vi.fn(),
      getOrganizations: vi.fn(),
      makeApiRequest: vi.fn()
    };
    service = new PipedriveOrganizationService(mockPipedriveService);
  });

  describe('createOrganization', () => {
    it('should create organization in Pipedrive', async () => {
      const orgData = {
        name: 'Test Corp',
        industry: 'Technology',
        country: 'USA'
      };

      const mockResponse = {
        success: true,
        orgId: 789
      };
      
      mockPipedriveService.createOrganization.mockResolvedValue(mockResponse);

      const result = await service.createOrganization(orgData);

      expect(result).toBe(789);
      expect(mockPipedriveService.createOrganization).toHaveBeenCalledWith({
        name: 'Test Corp',
        industry: 'Technology',
        country: 'USA'
      });
    });

    it('should create organization with minimal data', async () => {
      const orgData = {
        name: 'Minimal Corp'
      };

      const mockResponse = {
        success: true,
        orgId: 456
      };
      
      mockPipedriveService.createOrganization.mockResolvedValue(mockResponse);

      const result = await service.createOrganization(orgData);

      expect(result).toBe(456);
    });

    it('should handle API errors when creating organization', async () => {
      const orgData = {
        name: 'Test Corp',
        industry: 'Technology'
      };

      mockPipedriveService.createOrganization.mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        service.createOrganization(orgData)
      ).rejects.toThrow('API Error');
    });

    it('should handle failed API response', async () => {
      const orgData = {
        name: 'Test Corp'
      };

      const mockResponse = {
        success: false,
        error: 'Invalid data'
      };
      
      mockPipedriveService.createOrganization.mockResolvedValue(mockResponse);

      await expect(
        service.createOrganization(orgData)
      ).rejects.toThrow('Invalid data');
    });
  });

  describe('findOrganizationByName', () => {
    it('should find organization by name', async () => {
      const mockResponse = {
        success: true,
        organizations: [
          { id: 789, name: 'Test Corp', industry: 'Technology' },
          { id: 456, name: 'Other Corp', industry: 'Finance' }
        ]
      };
      
      mockPipedriveService.getOrganizations.mockResolvedValue(mockResponse);

      const result = await service.findOrganizationByName('Test Corp');

      expect(result).toEqual({
        id: 789,
        name: 'Test Corp',
        industry: 'Technology'
      });
    });

    it('should return null when organization not found', async () => {
      const mockResponse = {
        success: true,
        organizations: [
          { id: 789, name: 'Test Corp' },
          { id: 456, name: 'Other Corp' }
        ]
      };
      
      mockPipedriveService.getOrganizations.mockResolvedValue(mockResponse);

      const result = await service.findOrganizationByName('Nonexistent Corp');

      expect(result).toBeNull();
    });

    it('should handle case-insensitive name matching', async () => {
      const mockResponse = {
        success: true,
        organizations: [
          { id: 789, name: 'TEST CORP', industry: 'Technology' }
        ]
      };
      
      mockPipedriveService.getOrganizations.mockResolvedValue(mockResponse);

      const result = await service.findOrganizationByName('test corp');

      expect(result).toEqual({
        id: 789,
        name: 'TEST CORP',
        industry: 'Technology'
      });
    });

    it('should handle API errors when finding organization', async () => {
      mockPipedriveService.getOrganizations.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.findOrganizationByName('Test Corp');

      expect(result).toBeNull();
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        success: true,
        organizations: null
      };
      
      mockPipedriveService.getOrganizations.mockResolvedValue(mockResponse);

      const result = await service.findOrganizationByName('Test Corp');

      expect(result).toBeNull();
    });
  });

  describe('updateOrganization', () => {
    it('should update organization in Pipedrive', async () => {
      const updateData = {
        name: 'Updated Corp',
        industry: 'Updated Industry'
      };

      const mockResponse = {
        success: true,
        data: { data: { id: 789, ...updateData } }
      };
      
      mockPipedriveService.makeApiRequest.mockResolvedValue(mockResponse);

      const result = await service.updateOrganization('789', updateData);

      expect(result.success).toBe(true);
      expect(result.recordId).toBe('789');
      expect(mockPipedriveService.makeApiRequest).toHaveBeenCalledWith(
        '/organizations/789',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );
    });

    it('should handle update conflicts', async () => {
      const updateData = { name: 'Updated Name' };
      
      mockPipedriveService.makeApiRequest.mockRejectedValue(
        new Error('Conflict: Record modified by another user')
      );

      const result = await service.updateOrganization('789', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflict');
      expect(result.retryCount).toBe(3);
    });

    it('should handle API errors during update', async () => {
      const updateData = { name: 'Updated Name' };
      
      mockPipedriveService.makeApiRequest.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.updateOrganization('789', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('integration scenarios', () => {
    it('should find organization if exists', async () => {
      const mockResponse = {
        success: true,
        organizations: [
          { id: 123, name: 'New Corp', industry: 'Technology' },
          { id: 456, name: 'Existing Corp', industry: 'Finance' }
        ]
      };
      
      mockPipedriveService.getOrganizations.mockResolvedValue(mockResponse);

      const result = await service.findOrganizationByName('New Corp');

      expect(result?.id).toBe(123);
    });

    it('should handle find and update workflow', async () => {
      // Mock find response
      mockPipedriveService.getOrganizations.mockResolvedValue({
        success: true,
        organizations: [
          { id: 456, name: 'Existing Corp', industry: 'Finance' }
        ]
      });

      // Mock update response
      mockPipedriveService.makeApiRequest.mockResolvedValue({
        success: true,
        data: { data: { id: 456, name: 'Updated Corp' } }
      });

      // Find organization
      const found = await service.findOrganizationByName('Existing Corp');
      expect(found?.id).toBe(456);

      // Update organization
      const updateResult = await service.updateOrganization('456', {
        name: 'Updated Corp'
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.recordId).toBe('456');
    });
  });
}); 