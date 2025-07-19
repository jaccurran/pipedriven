import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipedriveService } from '@/server/services/pipedriveService';
import { prisma } from '@/lib/prisma';
import { decryptApiKey } from '@/lib/apiKeyEncryption';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('@/lib/apiKeyEncryption', () => ({
  decryptApiKey: vi.fn()
}));

vi.mock('@/lib/pipedrive-config', () => ({
  pipedriveConfig: {
    enableRetries: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableRateLimiting: true,
    enableDetailedLogging: false
  },
  getPipedriveApiUrl: () => 'https://api.pipedrive.com/v1',
  validatePipedriveConfig: () => []
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('PipedriveService', () => {
  let service: PipedriveService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PipedriveService(mockApiKey);
    (global.fetch as any).mockClear();
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting for multiple requests', async () => {
      // Mock successful API responses
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: true, data: {} }))
      });

      const startTime = Date.now();
      
      // Make multiple requests quickly
      const promises = Array.from({ length: 5 }, () => 
        service.testConnection()
      );
      
      await Promise.all(promises);
      const endTime = Date.now();

      // Should have made 5 requests
      expect(global.fetch).toHaveBeenCalledTimes(5);
      
      // Each request should have the API key
      for (let i = 0; i < 5; i++) {
        const call = (global.fetch as any).mock.calls[i];
        expect(call[0]).toContain('api_token=test-api-key');
      }
    });

    it('should handle rate limit exceeded responses from API', async () => {
      // Mock rate limit response
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => name === 'retry-after' ? '2' : null
        },
        text: () => Promise.resolve(JSON.stringify({ error: 'Rate limit exceeded' }))
      });

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should retry requests after rate limit delay', async () => {
      // Mock rate limit response first, then success
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: {
            get: (name: string) => name === 'retry-after' ? '1' : null
          },
          text: () => Promise.resolve(JSON.stringify({ error: 'Rate limit exceeded' }))
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ 
            success: true, 
            data: { data: { id: 1, name: 'Test User', email: 'test@example.com' } } 
          }))
        });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('API Key Validation', () => {
    it('should throw error for empty API key', () => {
      expect(() => new PipedriveService('')).toThrow('Pipedrive API key is required');
      expect(() => new PipedriveService('   ')).toThrow('Pipedrive API key is required');
    });

    it('should create service with valid API key', () => {
      expect(() => new PipedriveService('valid-key')).not.toThrow();
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          data: { data: mockUser }
        }))
      });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.user).toEqual({ data: mockUser });
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.endpoint).toBe('/users/me');
    });

    it('should handle connection failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve(JSON.stringify({ error: 'Invalid API key' }))
      });

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key expired');
    });
  });

  describe('translateSectorId', () => {
    it('should find sector field by name and translate ID to label', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Sector',
          key: 'sector-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'Technology', value: '1' },
            { id: 2, label: 'Healthcare', value: '2' },
            { id: 3, label: 'Finance', value: '3' }
          ]
        },
        {
          id: 2,
          name: 'Industry',
          key: 'industry-field-key',
          field_type: 'enum',
          options: [
            { id: 10, label: 'Manufacturing', value: '10' },
            { id: 11, label: 'Retail', value: '11' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSectorId(2);

      expect(result).toBe('Healthcare');
    });

    it('should find sector field by discovered key and translate ID to label', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Sector',
          key: 'discovered_sector_key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'Technology', value: '1' },
            { id: 2, label: 'Healthcare', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSectorId(1);

      expect(result).toBe('Technology');
    });

    it('should not find industry field when looking for sector', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Industry', // This should be ignored
          key: 'industry-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'Manufacturing', value: '1' },
            { id: 2, label: 'Retail', value: '2' }
          ]
        },
        {
          id: 2,
          name: 'Sector', // This should be found
          key: 'sector-field-key',
          field_type: 'enum',
          options: [
            { id: 10, label: 'Technology', value: '10' },
            { id: 11, label: 'Healthcare', value: '11' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSectorId(10);

      // Should find the Sector field, not the Industry field
      expect(result).toBe('Technology');
    });

    it('should return null when sector field is not found', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Country',
          key: 'country-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'UK', value: '1' },
            { id: 2, label: 'US', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSectorId(1);

      expect(result).toBeNull();
    });

    it('should return null when sector ID is not found in options', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Sector',
          key: 'sector-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'Technology', value: '1' },
            { id: 2, label: 'Healthcare', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSectorId(999); // Non-existent ID

      expect(result).toBeNull();
    });

    it('should handle API failure gracefully', async () => {
      // Mock the getOrganizationCustomFields method to return failure
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: false,
        error: 'Failed to fetch organization custom fields'
      });

      const result = await service.translateSectorId(1);

      expect(result).toBeNull();
    });
  });

  describe('translateSizeId', () => {
    it('should find size field by name and translate ID to label', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Size',
          key: 'size-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: '1-10', value: '1' },
            { id: 2, label: '11-50', value: '2' },
            { id: 3, label: '51-200', value: '3' }
          ]
        },
        {
          id: 2,
          name: 'Employee Count',
          key: 'employee-count-field-key',
          field_type: 'enum',
          options: [
            { id: 10, label: 'Small', value: '10' },
            { id: 11, label: 'Medium', value: '11' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSizeId(2);

      expect(result).toBe('11-50');
    });

    it('should find size field by discovered key and translate ID to label', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Size',
          key: 'discovered_size_key',
          field_type: 'enum',
          options: [
            { id: 1, label: '1-10', value: '1' },
            { id: 2, label: '11-50', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSizeId(1);

      expect(result).toBe('1-10');
    });

    it('should not find employee count field when looking for size', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Employee Count', // This should be ignored
          key: 'employee-count-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'Small', value: '1' },
            { id: 2, label: 'Medium', value: '2' }
          ]
        },
        {
          id: 2,
          name: 'Size', // This should be found
          key: 'size-field-key',
          field_type: 'enum',
          options: [
            { id: 10, label: '1-10', value: '10' },
            { id: 11, label: '11-50', value: '11' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSizeId(10);

      // Should find the Size field, not the Employee Count field
      expect(result).toBe('1-10');
    });

    it('should return null when size field is not found', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Country',
          key: 'country-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'UK', value: '1' },
            { id: 2, label: 'US', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSizeId(1);

      expect(result).toBeNull();
    });

    it('should return null when size ID is not found in options', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Size',
          key: 'size-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: '1-10', value: '1' },
            { id: 2, label: '11-50', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateSizeId(999); // Non-existent ID

      expect(result).toBeNull();
    });

    it('should handle API failure gracefully', async () => {
      // Mock the getOrganizationCustomFields method to return failure
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: false,
        error: 'Failed to fetch organization custom fields'
      });

      const result = await service.translateSizeId(1);

      expect(result).toBeNull();
    });
  });

  describe('translateCountryId', () => {
    it('should find country field by name and translate ID to label', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Country',
          key: 'country-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'United Kingdom', value: '1' },
            { id: 2, label: 'United States', value: '2' },
            { id: 3, label: 'Ireland', value: '3' }
          ]
        },
        {
          id: 2,
          name: 'Region',
          key: 'region-field-key',
          field_type: 'enum',
          options: [
            { id: 10, label: 'Europe', value: '10' },
            { id: 11, label: 'North America', value: '11' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateCountryId(2);

      expect(result).toBe('United States');
    });

    it('should find country field by discovered key and translate ID to label', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Country',
          key: 'discovered_country_key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'United Kingdom', value: '1' },
            { id: 2, label: 'United States', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateCountryId(1);

      expect(result).toBe('United Kingdom');
    });

    it('should not find region field when looking for country', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Region', // This should be ignored
          key: 'region-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'Europe', value: '1' },
            { id: 2, label: 'North America', value: '2' }
          ]
        },
        {
          id: 2,
          name: 'Country', // This should be found
          key: 'country-field-key',
          field_type: 'enum',
          options: [
            { id: 10, label: 'United Kingdom', value: '10' },
            { id: 11, label: 'Ireland', value: '11' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateCountryId(10);

      // Should find the Country field, not the Region field
      expect(result).toBe('United Kingdom');
    });

    it('should return null when country field is not found', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Sector',
          key: 'sector-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'Technology', value: '1' },
            { id: 2, label: 'Healthcare', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateCountryId(1);

      expect(result).toBeNull();
    });

    it('should return null when country ID is not found in options', async () => {
      const mockCustomFields = [
        {
          id: 1,
          name: 'Country',
          key: 'country-field-key',
          field_type: 'enum',
          options: [
            { id: 1, label: 'United Kingdom', value: '1' },
            { id: 2, label: 'United States', value: '2' }
          ]
        }
      ];

      // Mock the getOrganizationCustomFields method directly
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockCustomFields
      });

      const result = await service.translateCountryId(999); // Non-existent ID

      expect(result).toBeNull();
    });

    it('should handle API failure gracefully', async () => {
      // Mock the getOrganizationCustomFields method to return failure
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: false,
        error: 'Failed to fetch organization custom fields'
      });

      const result = await service.translateCountryId(1);

      expect(result).toBeNull();
    });
  });

  describe('discoverFieldMappings', () => {
    it('should discover field mappings from custom fields', async () => {
      const mockFields = [
        {
          id: 1,
          name: 'Size',
          key: 'size_key_123',
          field_type: 'enum',
          options: [
            { id: 1, value: '1', label: 'Small' },
            { id: 2, value: '2', label: 'Medium' },
            { id: 3, value: '3', label: 'Large' }
          ]
        },
        {
          id: 2,
          name: 'Country',
          key: 'country_key_456',
          field_type: 'enum',
          options: [
            { id: 1, value: '1', label: 'UK' },
            { id: 2, value: '2', label: 'Ireland' }
          ]
        },
        {
          id: 3,
          name: 'Sector',
          key: 'sector_key_789',
          field_type: 'enum',
          options: [
            { id: 1, value: '1', label: 'Technology' },
            { id: 2, value: '2', label: 'Finance' }
          ]
        }
      ]

      // Mock the getOrganizationCustomFields method
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockFields
      })

      const result = await service.discoverFieldMappings()

      expect(result.success).toBe(true)
      expect(result.mappings).toEqual({
        sizeFieldKey: 'size_key_123',
        countryFieldKey: 'country_key_456',
        sectorFieldKey: 'sector_key_789'
      })
    })

    it('should return cached mappings if available and not expired', async () => {
      const mockFields = [
        {
          id: 1,
          name: 'Size',
          key: 'cached_size_key',
          field_type: 'enum',
          options: []
        }
      ]

      // Mock the getOrganizationCustomFields method
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: true,
        fields: mockFields
      })

      // First call to populate cache
      const result1 = await service.discoverFieldMappings()
      expect(result1.success).toBe(true)

      // Second call should use cache
      const result2 = await service.discoverFieldMappings()
      expect(result2.success).toBe(true)
      expect(result2.mappings).toEqual(result1.mappings)

      // Verify getOrganizationCustomFields was only called once
      expect(service.getOrganizationCustomFields).toHaveBeenCalledTimes(1)
    })

    it('should handle missing custom fields gracefully', async () => {
      vi.spyOn(service, 'getOrganizationCustomFields').mockResolvedValue({
        success: false,
        error: 'API error'
      })

      const result = await service.discoverFieldMappings()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch organization custom fields')
    })
  })

  describe('getFieldMappings', () => {
    it('should return field mappings from discovery', async () => {
      const mockMappings = {
        sizeFieldKey: 'test_size_key',
        countryFieldKey: 'test_country_key',
        sectorFieldKey: 'test_sector_key'
      }

      vi.spyOn(service, 'discoverFieldMappings').mockResolvedValue({
        success: true,
        mappings: mockMappings
      })

      const result = await service.getFieldMappings()

      expect(result).toEqual(mockMappings)
    })

    it('should return empty object if discovery fails', async () => {
      vi.spyOn(service, 'discoverFieldMappings').mockResolvedValue({
        success: false,
        error: 'Discovery failed'
      })

      const result = await service.getFieldMappings()

      expect(result).toEqual({})
    })
  })
}); 