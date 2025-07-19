import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarmLeadService } from '@/server/services/warmLeadService';
import { WarmLeadTrigger } from '@/types/pipedrive';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

describe('WarmLeadService', () => {
  let service: WarmLeadService;
  let mockPipedriveService: any;
  let mockUserService: any;
  let mockLabelService: any;
  let mockOrgService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPipedriveService = {
      createOrUpdatePerson: vi.fn(),
      createPerson: vi.fn()
    };
    
    mockUserService = {
      findUserByEmail: vi.fn(),
      storeUserPipedriveId: vi.fn()
    };
    
    mockLabelService = {
      getWarmLeadLabelId: vi.fn()
    };
    
    mockOrgService = {
      createOrganization: vi.fn(),
      findOrganizationByName: vi.fn()
    };
    
    service = new WarmLeadService(
      mockPipedriveService,
      mockUserService,
      mockLabelService,
      mockOrgService
    );
  });

  describe('checkAndCreateWarmLead', () => {
    it('should create warm lead when score >= 4 and no Pipedrive ID', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      // Mock contact data
      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organisation: 'Test Corp',
        pipedrivePersonId: null,
        organizationId: 'org-123',
        organization: {
          id: 'org-123',
          name: 'Test Corp',
          industry: undefined,
          country: undefined,
          pipedriveOrgId: null
        }
      };

      // Mock user data
      const mockUser = {
        id: 'user-456',
        email: 'user@example.com',
        pipedriveUserId: 123
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockContact.organization as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Mock Pipedrive service calls
      mockOrgService.createOrganization.mockResolvedValue(456);
      mockPipedriveService.createPerson.mockResolvedValue({ 
        success: true, 
        personId: 789 
      });
      mockLabelService.getWarmLeadLabelId.mockResolvedValue(1);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(true);
      expect(mockPipedriveService.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: ['john@example.com'],
          phone: ['+1234567890'],
          org_name: 'Test Corp',
          label_ids: [1],
          owner_id: 123
        })
      );
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: {
          pipedrivePersonId: '789',
          pipedriveOrgId: '456',
          lastPipedriveUpdate: expect.any(Date)
        }
      });
    });

    it('should not create warm lead if already has Pipedrive ID', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      const mockContact = {
        id: 'contact-123',
        pipedrivePersonId: 'existing-id'
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(true); // Returns true because contact already exists
      expect(mockPipedriveService.createOrUpdatePerson).not.toHaveBeenCalled();
    });

    it('should not create warm lead if score < 4', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 3
      };

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(false);
      expect(mockPipedriveService.createOrUpdatePerson).not.toHaveBeenCalled();
    });

    it('should handle contact not found', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(null);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(false);
    });

    it('should handle user not found', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        pipedrivePersonId: null
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await service.checkAndCreateWarmLead(trigger);
      expect(result).toBe(false);
    });



    it('should handle organization with existing Pipedrive ID', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        pipedrivePersonId: null,
        organizationId: 'org-123',
        organisation: 'Test Corp',
        organization: {
          id: 'org-123',
          name: 'Test Corp',
          pipedriveOrgId: 'existing-org-id',
          industry: undefined,
          country: undefined
        }
      };

      const mockUser = {
        id: 'user-456',
        email: 'user@example.com'
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockContact.organization as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockPipedriveService.createPerson.mockResolvedValue({ 
        success: true, 
        personId: 789 
      });
      mockLabelService.getWarmLeadLabelId.mockResolvedValue(1);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(true);
      expect(mockOrgService.createOrganization).not.toHaveBeenCalled();
      expect(mockPipedriveService.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: ['john@example.com'],
          phone: ['+1234567890'],
          org_name: 'Test Corp',
          label_ids: [1],
          owner_id: undefined
        })
      );
    });

    it('should handle Pipedrive API errors gracefully', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        pipedrivePersonId: null
      };

      const mockUser = {
        id: 'user-456',
        email: 'user@example.com'
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockPipedriveService.createPerson.mockResolvedValue({ 
        success: false, 
        error: 'API Error' 
      });
      mockLabelService.getWarmLeadLabelId.mockResolvedValue(1);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(false);
    });

    it('should handle organization creation failure', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        pipedrivePersonId: null,
        organizationId: 'org-123',
        organisation: 'Test Corp',
        organization: {
          id: 'org-123',
          name: 'Test Corp',
          pipedriveOrgId: null,
          industry: undefined,
          country: undefined
        }
      };

      const mockUser = {
        id: 'user-456',
        email: 'user@example.com'
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockContact.organization as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockOrgService.createOrganization.mockRejectedValue(new Error('Org creation failed'));

      const result = await service.checkAndCreateWarmLead(trigger);
      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete warm lead creation workflow', async () => {
      const trigger: WarmLeadTrigger = {
        contactId: 'contact-123',
        userId: 'user-456',
        warmnessScore: 5
      };

      // Mock all dependencies
      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organisation: 'Test Corp',
        pipedrivePersonId: null,
        organizationId: 'org-123',
        organization: {
          id: 'org-123',
          name: 'Test Corp',
          pipedriveOrgId: null,
          industry: undefined,
          country: undefined
        }
      };

      const mockUser = {
        id: 'user-456',
        email: 'user@example.com'
      };

      vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockContact.organization as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      mockOrgService.createOrganization.mockResolvedValue(456);
      mockPipedriveService.createPerson.mockResolvedValue({ 
        success: true, 
        personId: 789 
      });
      mockLabelService.getWarmLeadLabelId.mockResolvedValue(1);

      const result = await service.checkAndCreateWarmLead(trigger);

      expect(result).toBe(true);
      
      // Verify all service calls
      expect(mockOrgService.createOrganization).toHaveBeenCalledWith({
        name: 'Test Corp',
        industry: undefined,
        country: undefined
      });
      expect(mockLabelService.getWarmLeadLabelId).toHaveBeenCalled();
      expect(mockPipedriveService.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: ['john@example.com'],
          phone: ['+1234567890'],
          org_name: 'Test Corp',
          label_ids: [1],
          owner_id: undefined
        })
      );
      
      // Verify database updates
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: { pipedriveOrgId: '456' }
      });
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: {
          pipedrivePersonId: '789',
          pipedriveOrgId: '456',
          lastPipedriveUpdate: expect.any(Date)
        }
      });
    });
  });
}); 