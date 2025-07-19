import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Database Schema - Pipedrive Integration', () => {
  let testUser: any;
  let testContact: any;
  let testActivity: any;
  let testOrganization: any;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.activity.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        pipedriveUserId: 12345
      }
    });

    // Create test organization
    testOrganization = await prisma.organization.create({
      data: {
        name: 'Test Corp',
        normalizedName: 'test corp',
        industry: 'Technology',
        country: 'USA',
        pipedriveOrgId: 'org-123',
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'SYNCED'
      }
    });

    // Create test contact
    testContact = await prisma.contact.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        warmnessScore: 5,
        pipedrivePersonId: 'person-123',
        pipedriveOrgId: 'org-123',
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'SYNCED',
        userId: testUser.id,
        organizationId: testOrganization.id
      }
    });

    // Create test activity
    testActivity = await prisma.activity.create({
      data: {
        type: 'EMAIL',
        subject: 'Test Activity',
        note: 'Test note',
        dueDate: new Date('2025-12-25T10:00:00Z'),
        pipedriveActivityId: 67890,
        replicatedToPipedrive: true,
        pipedriveSyncAttempts: 1,
        lastPipedriveSyncAttempt: new Date(),
        lastPipedriveUpdate: new Date(),
        updateSyncStatus: 'SYNCED',
        userId: testUser.id,
        contactId: testContact.id
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.activity.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('User Model', () => {
    it('should have pipedriveUserId field', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      
      expect(user?.pipedriveUserId).toBe(12345);
    });

    it('should allow updating pipedriveUserId', async () => {
      const updatedUser = await prisma.user.update({
        where: { id: testUser.id },
        data: { pipedriveUserId: 54321 }
      });
      
      expect(updatedUser.pipedriveUserId).toBe(54321);
    });
  });

  describe('Activity Model', () => {
    it('should have pipedrive integration fields', async () => {
      const activity = await prisma.activity.findUnique({
        where: { id: testActivity.id }
      });
      
      expect(activity?.pipedriveActivityId).toBe(67890);
      expect(activity?.replicatedToPipedrive).toBe(true);
      expect(activity?.pipedriveSyncAttempts).toBe(1);
      expect(activity?.lastPipedriveSyncAttempt).toBeInstanceOf(Date);
      expect(activity?.lastPipedriveUpdate).toBeInstanceOf(Date);
      expect(activity?.updateSyncStatus).toBe('SYNCED');
    });

    it('should allow updating sync status', async () => {
      const updatedActivity = await prisma.activity.update({
        where: { id: testActivity.id },
        data: {
          updateSyncStatus: 'PENDING',
          pipedriveSyncAttempts: 2,
          lastPipedriveSyncAttempt: new Date()
        }
      });
      
      expect(updatedActivity.updateSyncStatus).toBe('PENDING');
      expect(updatedActivity.pipedriveSyncAttempts).toBe(2);
    });

    it('should handle failed sync attempts', async () => {
      const failedActivity = await prisma.activity.update({
        where: { id: testActivity.id },
        data: {
          updateSyncStatus: 'FAILED',
          pipedriveSyncAttempts: 3,
          lastPipedriveSyncAttempt: new Date()
        }
      });
      
      expect(failedActivity.updateSyncStatus).toBe('FAILED');
      expect(failedActivity.pipedriveSyncAttempts).toBe(3);
    });
  });

  describe('Contact Model', () => {
    it('should have pipedrive integration fields', async () => {
      const contact = await prisma.contact.findUnique({
        where: { id: testContact.id }
      });
      
      expect(contact?.pipedrivePersonId).toBe('person-123');
      expect(contact?.pipedriveOrgId).toBe('org-123');
      expect(contact?.lastPipedriveUpdate).toBeInstanceOf(Date);
      expect(contact?.updateSyncStatus).toBe('SYNCED');
    });

    it('should allow updating sync status', async () => {
      const updatedContact = await prisma.contact.update({
        where: { id: testContact.id },
        data: {
          updateSyncStatus: 'PENDING',
          lastPipedriveUpdate: new Date()
        }
      });
      
      expect(updatedContact.updateSyncStatus).toBe('PENDING');
    });
  });

  describe('Organization Model', () => {
    it('should have pipedrive integration fields', async () => {
      const organization = await prisma.organization.findUnique({
        where: { id: testOrganization.id }
      });
      
      expect(organization?.pipedriveOrgId).toBe('org-123');
      expect(organization?.lastPipedriveUpdate).toBeInstanceOf(Date);
      expect(organization?.updateSyncStatus).toBe('SYNCED');
    });

    it('should allow updating sync status', async () => {
      const updatedOrg = await prisma.organization.update({
        where: { id: testOrganization.id },
        data: {
          updateSyncStatus: 'FAILED',
          lastPipedriveUpdate: new Date()
        }
      });
      
      expect(updatedOrg.updateSyncStatus).toBe('FAILED');
    });
  });

  describe('Relationships', () => {
    it('should maintain relationships between entities', async () => {
      const activityWithRelations = await prisma.activity.findUnique({
        where: { id: testActivity.id },
        include: {
          contact: true,
          user: true
        }
      });
      
      expect(activityWithRelations?.contact?.id).toBe(testContact.id);
      expect(activityWithRelations?.user?.id).toBe(testUser.id);
      expect(activityWithRelations?.contact?.pipedrivePersonId).toBe('person-123');
    });

    it('should allow querying by Pipedrive IDs', async () => {
      const contactByPipedriveId = await prisma.contact.findFirst({
        where: { pipedrivePersonId: 'person-123' }
      });
      
      expect(contactByPipedriveId?.id).toBe(testContact.id);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Try to create an activity with non-existent contact
      await expect(
        prisma.activity.create({
          data: {
            type: 'EMAIL',
            subject: 'Test',
            userId: testUser.id,
            contactId: 'non-existent-id'
          }
        })
      ).rejects.toThrow();
    });

    it('should handle null Pipedrive IDs gracefully', async () => {
      const contactWithoutPipedrive = await prisma.contact.create({
        data: {
          name: 'No Pipedrive Contact',
          email: 'no-pipedrive@example.com',
          warmnessScore: 3,
          userId: testUser.id
        }
      });
      
      expect(contactWithoutPipedrive.pipedrivePersonId).toBeNull();
      expect(contactWithoutPipedrive.updateSyncStatus).toBe('SYNCED');
    });
  });
}); 