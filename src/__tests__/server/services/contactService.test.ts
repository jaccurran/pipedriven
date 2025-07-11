// Mock the Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    campaign: {
      findMany: vi.fn(),
    },
  },
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ContactService } from '@/server/services/contactService'
import { prisma } from '@/lib/prisma'
import type { Contact, Activity, Campaign, User } from '@prisma/client'

const mockPrisma = vi.mocked(prisma)

describe('ContactService', () => {
  let contactService: ContactService
  let mockUser: User
  let mockContact: Contact

  beforeEach(() => {
    contactService = new ContactService()
    
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

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createContact', () => {
    it('should create a contact successfully', async () => {
      // Arrange
      const contactData: any = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        organisation: 'Tech Solutions',
        warmnessScore: 3,
        userId: mockUser.id,
      };

      (mockPrisma.contact.create as any).mockResolvedValue({
        ...mockContact,
        ...contactData,
      });

      // Act
      const result = await contactService.createContact(contactData);

      // Assert
      expect(result).toEqual({
        ...mockContact,
        ...contactData,
      });
      expect(mockPrisma.contact.create).toHaveBeenCalledWith({
        data: contactData,
      });
    });

    it('should create a contact with minimal data', async () => {
      // Arrange
      const contactData: any = {
        name: 'Minimal Contact',
        userId: mockUser.id,
      };

      (mockPrisma.contact.create as any).mockResolvedValue({
        ...mockContact,
        ...contactData,
        email: null,
        phone: null,
        organisation: null,
        warmnessScore: 0,
      });

      // Act
      const result = await contactService.createContact(contactData);

      // Assert
      expect(result.name).toBe('Minimal Contact');
      expect(result.email).toBeNull();
      expect(mockPrisma.contact.create).toHaveBeenCalledWith({
        data: contactData,
      });
    });

    it('should throw error when contact creation fails', async () => {
      // Arrange
      const contactData: any = {
        name: 'Failed Contact',
        userId: mockUser.id,
      };

      (mockPrisma.contact.create as any).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(contactService.createContact(contactData)).rejects.toThrow('Database error');
    });
  })

  describe('getContacts', () => {
    it('should return all contacts with pagination', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      const mockResponse = {
        contacts: mockContacts,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      const result = await contactService.getContacts({ page: 1, limit: 10 });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { userId: undefined },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter contacts by name', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      await contactService.getContacts({ name: 'John' });

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined,
          name: { contains: 'John', mode: 'insensitive' }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter contacts by email', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      await contactService.getContacts({ email: 'john@example.com' });

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined,
          email: { contains: 'john@example.com', mode: 'insensitive' }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter contacts by organisation', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      await contactService.getContacts({ organisation: 'Acme' });

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined,
          organisation: { contains: 'Acme', mode: 'insensitive' }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter contacts by warmness score range', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      await contactService.getContacts({ minWarmnessScore: 3, maxWarmnessScore: 7 });

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined,
          warmnessScore: { gte: 3, lte: 7 }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter contacts by campaign', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      await contactService.getContacts({ campaignId: 'campaign-123' });

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined,
          campaigns: { some: { id: 'campaign-123' } }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter contacts by added to campaign status', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      await contactService.getContacts({ addedToCampaign: true });

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: { 
          userId: undefined,
          addedToCampaign: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  })

  describe('getContactById', () => {
    it('should return contact by ID with relations', async () => {
      // Arrange
      const contactWithRelations: any = {
        ...mockContact,
        activities: [],
        campaigns: [],
        user: mockUser,
      };
      (mockPrisma.contact.findUnique as any).mockResolvedValue(contactWithRelations);

      // Act
      const result = await contactService.getContactById(mockContact.id);

      // Assert
      expect(result).toEqual(contactWithRelations);
      expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: mockContact.id },
        include: {
          activities: true,
          campaigns: true,
          user: true,
        },
      });
    });

    it('should return null when contact not found', async () => {
      // Arrange
      (mockPrisma.contact.findUnique as any).mockResolvedValue(null);

      // Act
      const result = await contactService.getContactById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      // Arrange
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      const updatedContact: Contact = { ...mockContact, ...updateData };
      (mockPrisma.contact.update as any).mockResolvedValue(updatedContact);

      // Act
      const result = await contactService.updateContact(mockContact.id, updateData);

      // Assert
      expect(result).toEqual(updatedContact);
      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: mockContact.id },
        data: updateData,
      });
    });

    it('should throw error when contact update fails', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      (mockPrisma.contact.update as any).mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(contactService.updateContact(mockContact.id, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('deleteContact', () => {
    it('should delete contact successfully', async () => {
      // Arrange
      (mockPrisma.contact.delete as any).mockResolvedValue(mockContact);

      // Act
      const result = await contactService.deleteContact('contact-123');

      // Assert
      expect(result).toEqual(mockContact);
      expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
      });
    });

    it('should throw error when contact deletion fails', async () => {
      // Arrange
      (mockPrisma.contact.delete as any).mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(contactService.deleteContact('contact-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('assignContactToCampaigns', () => {
    it('should assign contact to campaigns successfully', async () => {
      // Arrange
      const campaignIds: string[] = ['campaign-1', 'campaign-2'];
      const contactWithCampaigns: any = {
        ...mockContact,
        campaigns: [{ id: 'campaign-1' }, { id: 'campaign-2' }],
      };
      (mockPrisma.contact.update as any).mockResolvedValue(contactWithCampaigns);

      // Act
      const result = await contactService.assignContactToCampaigns('contact-123', campaignIds);

      // Assert
      expect(result).toEqual(contactWithCampaigns);
      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: {
          campaigns: {
            connect: campaignIds.map(id => ({ id })),
          },
        },
        include: {
          campaigns: true,
        },
      });
    });

    it('should throw error when assignment fails', async () => {
      // Arrange
      const campaignIds: string[] = ['campaign-1'];
      (mockPrisma.contact.update as any).mockRejectedValue(new Error('Assignment failed'));

      // Act & Assert
      await expect(contactService.assignContactToCampaigns('contact-123', campaignIds)).rejects.toThrow('Assignment failed');
    });
  });

  describe('removeContactFromCampaigns', () => {
    it('should remove contact from campaigns successfully', async () => {
      // Arrange
      const campaignIds: string[] = ['campaign-1'];
      const contactWithRemainingCampaigns: any = {
        ...mockContact,
        campaigns: [],
      };
      (mockPrisma.contact.update as any).mockResolvedValue(contactWithRemainingCampaigns);

      // Act
      const result = await contactService.removeContactFromCampaigns('contact-123', campaignIds);

      // Assert
      expect(result).toEqual(contactWithRemainingCampaigns);
      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: {
          campaigns: {
            disconnect: campaignIds.map(id => ({ id })),
          },
        },
        include: {
          campaigns: true,
        },
      });
    });
  });

  describe('getContactAnalytics', () => {
    it('should get contact analytics successfully', async () => {
      // Arrange
      const mockActivities: Activity[] = [
        {
          id: 'activity-1',
          type: 'EMAIL',
          subject: 'Follow-up',
          note: 'Sent follow-up email',
          dueDate: new Date('2024-01-15'),
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          contactId: mockContact.id,
          userId: mockUser.id,
          campaignId: null,
        } as Activity,
      ];
      const mockContactWithCampaigns: any = {
        ...mockContact,
        campaigns: [],
      };
      (mockPrisma.activity.findMany as any).mockResolvedValue(mockActivities);
      (mockPrisma.contact.findUnique as any).mockResolvedValue(mockContactWithCampaigns);

      // Act
      const result = await contactService.getContactAnalytics(mockContact.id);

      // Assert
      expect(result.totalActivities).toBe(mockActivities.length);
      expect(result.activityBreakdown).toBeDefined();
      expect(result.lastActivityDate).toBeDefined();
      expect(result.averageWarmnessScore).toBeDefined();
      expect(result.campaignsCount).toBeDefined();
    });

    it('should handle contact with no activities', async () => {
      // Arrange
      (mockPrisma.activity.findMany as any).mockResolvedValue([]);
      (mockPrisma.activity.count as any).mockResolvedValue(0);

      // Act
      const result = await contactService.getContactAnalytics(mockContact.id);

      // Assert
      expect(result.totalActivities).toBe(0);
      expect(result.activityBreakdown).toEqual({});
      expect(result.lastActivityDate).toBeNull();
      expect(result.averageWarmnessScore).toBe(0);
      expect(result.campaignsCount).toBe(0);
    });
  });

  describe('searchContacts', () => {
    it('should search contacts by multiple criteria', async () => {
      // Arrange
      const mockContacts: Contact[] = [mockContact];
      (mockPrisma.contact.findMany as any).mockResolvedValue(mockContacts);
      (mockPrisma.contact.count as any).mockResolvedValue(1);

      // Act
      await contactService.searchContacts({
        query: 'john',
        minWarmnessScore: 3,
        maxWarmnessScore: 7,
        addedToCampaign: true,
      });

      // Assert
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({
        where: {
          userId: undefined,
          OR: [
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { organisation: { contains: 'john', mode: 'insensitive' } },
          ],
          warmnessScore: { gte: 3, lte: 7 },
          addedToCampaign: true,
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });


  })

  describe('getContactPerformance', () => {
    it('should return contact performance metrics', async () => {
      // Arrange
      const mockActivities = [
        { type: 'EMAIL', createdAt: new Date('2024-01-01') },
        { type: 'CALL', createdAt: new Date('2024-01-02') },
        { type: 'MEETING', createdAt: new Date('2024-01-03') },
      ] as Activity[]

      (mockPrisma.activity.findMany as any).mockResolvedValue(mockActivities)

      // Act
      const result = await contactService.getContactPerformance('contact-123')

      // Assert
      expect(result).toEqual({
        totalActivities: 3,
        activitiesThisMonth: 0, // These activities are from January, not recent
        activitiesThisWeek: 0,  // These activities are from January, not recent
        responseRate: 0,
        averageResponseTime: 0,
        lastActivityType: 'EMAIL', // Most recent activity (ordered by createdAt desc)
        engagementScore: expect.any(Number),
      })
    })
  })
}) 