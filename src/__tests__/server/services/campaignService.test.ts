import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { CampaignService } from '@/server/services/campaignService'
import type { User, Campaign, Contact, Activity, UserRole, CampaignStatus } from '@prisma/client'

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockPrisma = vi.mocked(prisma)

describe('CampaignService', () => {
  let campaignService: CampaignService
  let mockUser: User
  let mockCampaign: Campaign
  let mockContact: Contact

  beforeEach(() => {
    campaignService = new CampaignService()
    
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: null,
      role: 'CONSULTANT' as UserRole,
      pipedriveApiKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: null,
      image: null,
    };

    mockCampaign = {
      id: 'campaign-123',
      name: 'Q1 Lead Generation',
      description: 'Target high-value prospects for Q1',
      sector: 'Technology',
      theme: 'Digital Transformation',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      status: 'ACTIVE' as CampaignStatus,
      targetLeads: 100,
      budget: 5000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      organisation: 'Tech Corp',
      warmnessScore: 5,
      lastContacted: null,
      addedToCampaign: false,
      pipedrivePersonId: null,
      pipedriveOrgId: null,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createCampaign', () => {
    it('should create a campaign successfully', async () => {
      // Arrange
      const campaignData = {
        name: 'Q1 Lead Generation',
        description: 'Target high-value prospects for Q1',
        sector: 'Technology',
        theme: 'Digital Transformation',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
      };

      (mockPrisma.campaign.create as any).mockResolvedValue(mockCampaign)

      // Act
      const result = await campaignService.createCampaign(campaignData)

      // Assert
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({
        data: campaignData,
      })
      expect(result).toEqual(mockCampaign)
    })

    it('should create a campaign with minimal data', async () => {
      // Arrange
      const campaignData = {
        name: 'Minimal Campaign',
      }

      const minimalCampaign = { ...mockCampaign, ...campaignData, description: null, sector: null, theme: null, startDate: null, endDate: null };
      (mockPrisma.campaign.create as any).mockResolvedValue(minimalCampaign);

      // Act
      const result = await campaignService.createCampaign(campaignData)

      // Assert
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({
        data: campaignData,
      })
      expect(result).toEqual(minimalCampaign)
    })

    it('should throw error when campaign creation fails', async () => {
      // Arrange
      const campaignData = {
        name: 'Q1 Lead Generation',
      };

      (mockPrisma.campaign.create as any).mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(campaignService.createCampaign(campaignData)).rejects.toThrow('Database error')
    })
  })

  describe('getCampaigns', () => {
    it('should return all campaigns with pagination', async () => {
      // Arrange
      const campaigns = [mockCampaign];
      const totalCount = 1;

      (mockPrisma.campaign.findMany as any).mockResolvedValue(campaigns);
      (mockPrisma.campaign.count as any).mockResolvedValue(totalCount);

      // Act
      const result = await campaignService.getCampaigns({ page: 1, limit: 10 });

      // Assert
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.campaign.count).toHaveBeenCalled();
      expect(result).toEqual({
        campaigns,
        pagination: {
          page: 1,
          limit: 10,
          total: totalCount,
          totalPages: 1,
        },
      });
    });

    it('should filter campaigns by sector', async () => {
      // Arrange
      const campaigns = [mockCampaign];
      const totalCount = 1;

      (mockPrisma.campaign.findMany as any).mockResolvedValue(campaigns);
      (mockPrisma.campaign.count as any).mockResolvedValue(totalCount);

      // Act
      const result = await campaignService.getCampaigns({ 
        page: 1, 
        limit: 10, 
        sector: 'Technology' 
      });

      // Assert
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { sector: 'Technology' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.campaigns).toEqual(campaigns);
    });

    it('should filter campaigns by date range', async () => {
      // Arrange
      const campaigns = [mockCampaign];
      const totalCount = 1;
      (mockPrisma.campaign.findMany as any).mockResolvedValue(campaigns);
      (mockPrisma.campaign.count as any).mockResolvedValue(totalCount);

      // Act
      await campaignService.getCampaigns({ 
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      });

      // Assert
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined,
          startDate: { gte: new Date('2024-01-01') },
          endDate: { lte: new Date('2024-03-31') }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter campaigns by status', async () => {
      // Arrange
      const campaigns = [mockCampaign];
      const totalCount = 1;
      (mockPrisma.campaign.findMany as any).mockResolvedValue(campaigns);
      (mockPrisma.campaign.count as any).mockResolvedValue(totalCount);

      // Act
      await campaignService.getCampaigns({});

      // Assert
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  })

  describe('getCampaignById', () => {
    it('should return campaign by ID with relations', async () => {
      // Arrange
      const campaignWithRelations = {
        ...mockCampaign,
        contacts: [],
        activities: [],
        user: mockUser,
      };
      (mockPrisma.campaign.findUnique as any).mockResolvedValue(campaignWithRelations);

      // Act
      const result = await campaignService.getCampaignById(mockCampaign.id);

      // Assert
      expect(result).toEqual(campaignWithRelations);
      expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: mockCampaign.id },
        include: {
          contacts: true,
          activities: true,
          user: true,
        },
      });
    });

    it('should return null when campaign not found', async () => {
      // Arrange
      (mockPrisma.campaign.findUnique as any).mockResolvedValue(null);

      // Act
      const result = await campaignService.getCampaignById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  })

  describe('updateCampaign', () => {
    it('should update campaign successfully', async () => {
      // Arrange
      const updateData = { name: 'Updated Campaign', description: 'Updated description' };
      const updatedCampaign = { ...mockCampaign, ...updateData };
      (mockPrisma.campaign.update as any).mockResolvedValue(updatedCampaign);

      // Act
      const result = await campaignService.updateCampaign(mockCampaign.id, updateData);

      // Assert
      expect(result).toEqual(updatedCampaign);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: mockCampaign.id },
        data: updateData,
      });
    });

    it('should throw error when campaign update fails', async () => {
      // Arrange
      const updateData = { name: 'Updated Campaign' };
      (mockPrisma.campaign.update as any).mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(campaignService.updateCampaign(mockCampaign.id, updateData)).rejects.toThrow('Update failed');
    });
  })

  describe('deleteCampaign', () => {
    it('should delete campaign successfully', async () => {
      // Arrange
      (mockPrisma.campaign.delete as any).mockResolvedValue(mockCampaign);

      // Act
      const result = await campaignService.deleteCampaign('campaign-123');

      // Assert
      expect(result).toEqual(mockCampaign);
      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
    });

    it('should throw error when campaign deletion fails', async () => {
      // Arrange
      (mockPrisma.campaign.delete as any).mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(campaignService.deleteCampaign('campaign-123')).rejects.toThrow('Delete failed');
    });
  })

  describe('assignContactsToCampaign', () => {
    it('should assign contacts to campaign successfully', async () => {
      // Arrange
      const contactIds = ['contact-1', 'contact-2'];
      const contacts = [
        { id: 'contact-1', name: 'Contact 1' },
        { id: 'contact-2', name: 'Contact 2' },
      ];
      (mockPrisma.contact.findMany as any).mockResolvedValue(contacts);
      (mockPrisma.campaign.update as any).mockResolvedValue({
        ...mockCampaign,
        contacts,
      });

      // Act
      const result = await campaignService.assignContactsToCampaign('campaign-123', contactIds);

      // Assert
      expect(result.contacts).toEqual(contacts);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          contacts: {
            connect: contactIds.map(id => ({ id })),
          },
        },
        include: {
          contacts: true,
        },
      });
    });

    it('should throw error when contact assignment fails', async () => {
      // Arrange
      const contactIds = ['contact-1'];
      const foundContacts = [{ id: 'contact-1', name: 'Contact 1' }];
      (mockPrisma.contact.findMany as any).mockResolvedValue(foundContacts);
      (mockPrisma.campaign.update as any).mockRejectedValue(new Error('Assignment failed'));

      // Act & Assert
      await expect(campaignService.assignContactsToCampaign('campaign-123', contactIds)).rejects.toThrow('Assignment failed');
    });

    it('should remove contacts from campaign successfully', async () => {
      // Arrange
      const contactIds = ['contact-1'];
      const contacts = [{ id: 'contact-1', name: 'Contact 1' }];
      (mockPrisma.contact.findMany as any).mockResolvedValue(contacts);
      (mockPrisma.campaign.update as any).mockResolvedValue({
        ...mockCampaign,
        contacts: [],
      });

      // Act
      const result = await campaignService.removeContactsFromCampaign('campaign-123', contactIds);

      // Assert
      expect(result.contacts).toEqual([]);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          contacts: {
            disconnect: contactIds.map(id => ({ id })),
          },
        },
        include: {
          contacts: true,
        },
      });
    });
  })

  describe('getCampaignAnalytics', () => {
    it('should return campaign analytics', async () => {
      // Arrange
      const activities = [
        { id: 'activity-1', type: 'EMAIL', createdAt: new Date('2024-01-03') },
        { id: 'activity-2', type: 'CALL', createdAt: new Date('2024-01-02') },
        { id: 'activity-3', type: 'MEETING', createdAt: new Date('2024-01-01') },
      ];
      (mockPrisma.activity.findMany as any).mockResolvedValue(activities);
      (mockPrisma.activity.count as any).mockResolvedValue(3);
      (mockPrisma.contact.count as any).mockResolvedValue(25);

      // Act
      const result = await campaignService.getCampaignAnalytics('campaign-123');

      // Assert
      expect(result).toEqual({
        totalActivities: 3,
        activityBreakdown: {
          EMAIL: 1,
          CALL: 1,
          MEETING: 1,
          LINKEDIN: 0,
          REFERRAL: 0,
          CONFERENCE: 0,
        },
        contactsCount: 25,
        averageWarmnessScore: 5,
      });

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { campaignId: 'campaign-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle campaign with no activities', async () => {
      // Arrange
      const contacts = [{ id: 'contact-1', name: 'Contact 1' }];
      (mockPrisma.contact.findMany as any).mockResolvedValue(contacts);
      (mockPrisma.activity.count as any).mockResolvedValue(0);

      // Act
      const result = await campaignService.getCampaignAnalytics('campaign-123');

      // Assert
      expect(result.totalActivities).toBe(0);
    });
  })

  describe('getCampaignPerformance', () => {
    it('should return campaign performance metrics', async () => {
      // Arrange
      const contacts = [
        { ...mockContact, warmnessScore: 5, addedToCampaign: true },
        { ...mockContact, id: 'contact-2', warmnessScore: 8, addedToCampaign: true },
        { ...mockContact, id: 'contact-3', warmnessScore: 3, addedToCampaign: false },
      ];

      (mockPrisma.contact.findMany as any).mockResolvedValue(contacts);
      (mockPrisma.activity.count as any).mockResolvedValue(15);

      // Act
      const result = await campaignService.getCampaignPerformance('campaign-123');

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { campaigns: { some: { id: 'campaign-123' } } },
      });
      expect(result).toEqual({
        totalContacts: 3,
        activeContacts: 2,
        averageWarmnessScore: 5.33,
        totalActivities: 15,
        conversionRate: 66.67,
      });
    });
  });
}); 