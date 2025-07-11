import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../setup'
import type { User, Contact, UserRole } from '@prisma/client'

describe('Contact Model', () => {
  // Helper function to create a test user
  const createTestUser = async (email = 'testuser@example.com') => {
    return await prisma.user.create({
      data: {
        email,
        name: 'Test User',
        role: 'CONSULTANT' as UserRole,
      },
    })
  }

  describe('Contact Creation', () => {
    it('should create a contact with required fields', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organisation: 'Acme Corp',
        userId: testUser.id,
      }

      // Act
      const contact = await prisma.contact.create({
        data: contactData,
      })

      // Assert
      expect(contact).toBeDefined()
      expect(contact.id).toBeDefined()
      expect(contact.name).toBe(contactData.name)
      expect(contact.email).toBe(contactData.email)
      expect(contact.phone).toBe(contactData.phone)
      expect(contact.organisation).toBe(contactData.organisation)
      expect(contact.userId).toBe(testUser.id)
      expect(contact.warmnessScore).toBe(0) // Default value
      expect(contact.lastContacted).toBeNull()
      expect(contact.addedToCampaign).toBe(false) // Default value
      expect(contact.pipedrivePersonId).toBeNull()
      expect(contact.pipedriveOrgId).toBeNull()
      expect(contact.createdAt).toBeInstanceOf(Date)
      expect(contact.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a contact with optional fields', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contactData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        organisation: 'Tech Solutions',
        warmnessScore: 5,
        lastContacted: new Date('2024-01-15'),
        addedToCampaign: true,
        pipedrivePersonId: 'pipedrive-person-123',
        pipedriveOrgId: 'pipedrive-org-456',
        userId: testUser.id,
      }

      // Act
      const contact = await prisma.contact.create({
        data: contactData,
      })

      // Assert
      expect(contact.warmnessScore).toBe(5)
      expect(contact.lastContacted).toEqual(new Date('2024-01-15'))
      expect(contact.addedToCampaign).toBe(true)
      expect(contact.pipedrivePersonId).toBe('pipedrive-person-123')
      expect(contact.pipedriveOrgId).toBe('pipedrive-org-456')
    })

    it('should create a contact with minimal required fields', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contactData = {
        name: 'Minimal Contact',
        userId: testUser.id,
      }

      // Act
      const contact = await prisma.contact.create({
        data: contactData,
      })

      // Assert
      expect(contact.name).toBe('Minimal Contact')
      expect(contact.email).toBeNull()
      expect(contact.phone).toBeNull()
      expect(contact.organisation).toBeNull()
      expect(contact.userId).toBe(testUser.id)
    })

    it('should enforce user relationship constraint', async () => {
      // Arrange
      const contactData = {
        name: 'Invalid Contact',
        userId: 'non-existent-user-id',
      }

      // Act & Assert
      await expect(
        prisma.contact.create({
          data: contactData,
        })
      ).rejects.toThrow()
    })
  })

  describe('Contact-User Relationships', () => {
    it('should retrieve contact with user information', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Relationship Contact',
          email: 'relationship@example.com',
          userId: testUser.id,
        },
        include: {
          user: true,
        },
      })

      // Assert
      expect(contact.user).toBeDefined()
      expect(contact.user.id).toBe(testUser.id)
      expect(contact.user.email).toBe(testUser.email)
      expect(contact.user.name).toBe(testUser.name)
    })

    it('should retrieve user with contacts', async () => {
      // Arrange
      const testUser = await createTestUser()
      await prisma.contact.createMany({
        data: [
          {
            name: 'Contact 1',
            email: 'contact1@example.com',
            userId: testUser.id,
          },
          {
            name: 'Contact 2',
            email: 'contact2@example.com',
            userId: testUser.id,
          },
        ],
      })

      // Act
      const userWithContacts = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: {
          contacts: true,
        },
      })

      // Assert
      expect(userWithContacts?.contacts).toHaveLength(2)
      expect(userWithContacts?.contacts[0].name).toBe('Contact 1')
      expect(userWithContacts?.contacts[1].name).toBe('Contact 2')
    })

    it('should cascade delete contacts when user is deleted', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Cascade Contact',
          email: 'cascade@example.com',
          userId: testUser.id,
        },
      })

      // Act
      await prisma.user.delete({
        where: { id: testUser.id },
      })

      // Assert
      const deletedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      })
      expect(deletedContact).toBeNull()
    })
  })

  describe('Contact Warmness Scoring', () => {
    it('should allow warmness score updates', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Warm Contact',
          email: 'warm@example.com',
          warmnessScore: 3,
          userId: testUser.id,
        },
      })

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          warmnessScore: 8,
        },
      })

      // Assert
      expect(updatedContact.warmnessScore).toBe(8)
    })

    it('should allow negative warmness scores', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contactData = {
        name: 'Cold Contact',
        email: 'cold@example.com',
        warmnessScore: -2,
        userId: testUser.id,
      }

      // Act
      const contact = await prisma.contact.create({
        data: contactData,
      })

      // Assert
      expect(contact.warmnessScore).toBe(-2)
    })

    it('should allow high warmness scores', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contactData = {
        name: 'Hot Contact',
        email: 'hot@example.com',
        warmnessScore: 10,
        userId: testUser.id,
      }

      // Act
      const contact = await prisma.contact.create({
        data: contactData,
      })

      // Assert
      expect(contact.warmnessScore).toBe(10)
    })
  })

  describe('Contact Last Contacted Tracking', () => {
    it('should update last contacted date', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Contacted Contact',
          email: 'contacted@example.com',
          userId: testUser.id,
        },
      })

      const contactDate = new Date('2024-01-20T10:00:00Z')

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          lastContacted: contactDate,
        },
      })

      // Assert
      expect(updatedContact.lastContacted).toEqual(contactDate)
    })

    it('should handle null last contacted date', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Never Contacted',
          email: 'never@example.com',
          lastContacted: new Date('2024-01-15'),
          userId: testUser.id,
        },
      })

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          lastContacted: null,
        },
      })

      // Assert
      expect(updatedContact.lastContacted).toBeNull()
    })
  })

  describe('Contact Campaign Assignment', () => {
    it('should track campaign assignment status', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Campaign Contact',
          email: 'campaign@example.com',
          addedToCampaign: false,
          userId: testUser.id,
        },
      })

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          addedToCampaign: true,
        },
      })

      // Assert
      expect(updatedContact.addedToCampaign).toBe(true)
    })
  })

  describe('Contact Pipedrive Integration', () => {
    it('should store Pipedrive person ID', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Pipedrive Contact',
          email: 'pipedrive@example.com',
          userId: testUser.id,
        },
      })

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          pipedrivePersonId: 'pipedrive-person-789',
        },
      })

      // Assert
      expect(updatedContact.pipedrivePersonId).toBe('pipedrive-person-789')
    })

    it('should store Pipedrive organization ID', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Org Contact',
          email: 'org@example.com',
          organisation: 'Test Organization',
          userId: testUser.id,
        },
      })

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          pipedriveOrgId: 'pipedrive-org-999',
        },
      })

      // Assert
      expect(updatedContact.pipedriveOrgId).toBe('pipedrive-org-999')
    })

    it('should handle both Pipedrive IDs together', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Full Pipedrive Contact',
          email: 'full@example.com',
          organisation: 'Full Organization',
          userId: testUser.id,
        },
      })

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          pipedrivePersonId: 'person-123',
          pipedriveOrgId: 'org-456',
        },
      })

      // Assert
      expect(updatedContact.pipedrivePersonId).toBe('person-123')
      expect(updatedContact.pipedriveOrgId).toBe('org-456')
    })
  })

  describe('Contact Retrieval and Queries', () => {
    it('should find contacts by user ID', async () => {
      // Arrange
      const testUser = await createTestUser()
      await prisma.contact.createMany({
        data: [
          {
            name: 'User Contact 1',
            email: 'user1@example.com',
            userId: testUser.id,
          },
          {
            name: 'User Contact 2',
            email: 'user2@example.com',
            userId: testUser.id,
          },
        ],
      })

      // Act
      const userContacts = await prisma.contact.findMany({
        where: { userId: testUser.id },
      })

      // Assert
      expect(userContacts).toHaveLength(2)
      expect(userContacts[0].userId).toBe(testUser.id)
      expect(userContacts[1].userId).toBe(testUser.id)
    })

    it('should find contacts by email', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Email Search Contact',
          email: 'emailsearch@example.com',
          userId: testUser.id,
        },
      })

      // Act
      const foundContact = await prisma.contact.findFirst({
        where: { email: 'emailsearch@example.com' },
      })

      // Assert
      expect(foundContact).toBeDefined()
      expect(foundContact?.id).toBe(contact.id)
    })

    it('should find contacts by organization', async () => {
      // Arrange
      const testUser = await createTestUser()
      await prisma.contact.createMany({
        data: [
          {
            name: 'Org Contact 1',
            organisation: 'Same Corp',
            userId: testUser.id,
          },
          {
            name: 'Org Contact 2',
            organisation: 'Same Corp',
            userId: testUser.id,
          },
          {
            name: 'Other Contact',
            organisation: 'Different Corp',
            userId: testUser.id,
          },
        ],
      })

      // Act
      const sameCorpContacts = await prisma.contact.findMany({
        where: { organisation: 'Same Corp' },
      })

      // Assert
      expect(sameCorpContacts).toHaveLength(2)
      expect(sameCorpContacts[0].organisation).toBe('Same Corp')
      expect(sameCorpContacts[1].organisation).toBe('Same Corp')
    })

    it('should find contacts by warmness score range', async () => {
      // Arrange
      const testUser = await createTestUser()
      await prisma.contact.createMany({
        data: [
          {
            name: 'Cold Contact',
            email: 'cold@example.com',
            warmnessScore: 2,
            userId: testUser.id,
          },
          {
            name: 'Warm Contact',
            email: 'warm@example.com',
            warmnessScore: 7,
            userId: testUser.id,
          },
          {
            name: 'Hot Contact',
            email: 'hot@example.com',
            warmnessScore: 9,
            userId: testUser.id,
          },
        ],
      })

      // Act
      const warmContacts = await prisma.contact.findMany({
        where: {
          warmnessScore: {
            gte: 5,
            lte: 8,
          },
        },
      })

      // Assert
      expect(warmContacts).toHaveLength(1)
      expect(warmContacts[0].name).toBe('Warm Contact')
    })
  })

  describe('Contact Updates', () => {
    it('should update contact information', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Original Name',
          email: 'original@example.com',
          phone: '123-456-7890',
          organisation: 'Original Corp',
          userId: testUser.id,
        },
      })

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          name: 'Updated Name',
          email: 'updated@example.com',
          phone: '098-765-4321',
          organisation: 'Updated Corp',
        },
      })

      // Assert
      expect(updatedContact.name).toBe('Updated Name')
      expect(updatedContact.email).toBe('updated@example.com')
      expect(updatedContact.phone).toBe('098-765-4321')
      expect(updatedContact.organisation).toBe('Updated Corp')
      expect(updatedContact.updatedAt.getTime()).toBeGreaterThanOrEqual(contact.updatedAt.getTime())
    })
  })

  describe('Contact Deletion', () => {
    it('should delete a contact', async () => {
      // Arrange
      const testUser = await createTestUser()
      const contact = await prisma.contact.create({
        data: {
          name: 'Delete Contact',
          email: 'delete@example.com',
          userId: testUser.id,
        },
      })

      // Act
      await prisma.contact.delete({
        where: { id: contact.id },
      })

      // Assert
      const deletedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      })
      expect(deletedContact).toBeNull()
    })
  })
}) 