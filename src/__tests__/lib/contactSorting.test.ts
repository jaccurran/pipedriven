import { describe, it, expect } from 'vitest'
import type { Contact, Activity } from '@prisma/client'

// Mock contact data for testing
const createMockContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  organisation: 'Acme Corp',
  warmnessScore: 0,
  lastContacted: null,
  addedToCampaign: false,
  pipedrivePersonId: null,
  pipedriveOrgId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  userId: 'user-1',
  ...overrides,
})

const createMockActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-1',
  type: 'EMAIL',
  subject: 'Test email',
  note: 'Test note',
  dueDate: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  userId: 'user-1',
  contactId: 'contact-1',
  campaignId: null,
  ...overrides,
})

describe('Contact Sorting Logic', () => {
  describe('sortContactsForMy500', () => {
    it('should sort contacts by recurring activity frequency (ASC)', () => {
      // Arrange
      const contacts = [
        createMockContact({ 
          id: 'contact-1', 
          name: 'High Frequency',
          warmnessScore: 8,
          lastContacted: new Date('2024-01-15')
        }),
        createMockContact({ 
          id: 'contact-2', 
          name: 'Low Frequency',
          warmnessScore: 2,
          lastContacted: new Date('2024-01-10')
        }),
        createMockContact({ 
          id: 'contact-3', 
          name: 'Medium Frequency',
          warmnessScore: 5,
          lastContacted: new Date('2024-01-12')
        }),
      ]

      // Act
      const sortedContacts = sortContactsForMy500(contacts)

      // Assert
      expect(sortedContacts[0].name).toBe('Low Frequency') // Lowest warmness score first
      expect(sortedContacts[1].name).toBe('Medium Frequency')
      expect(sortedContacts[2].name).toBe('High Frequency')
    })

    it('should sort by last activity date (ASC) when warmness scores are equal', () => {
      // Arrange
      const contacts = [
        createMockContact({ 
          id: 'contact-1', 
          name: 'Recent Contact',
          warmnessScore: 5,
          lastContacted: new Date('2024-01-15')
        }),
        createMockContact({ 
          id: 'contact-2', 
          name: 'Old Contact',
          warmnessScore: 5,
          lastContacted: new Date('2024-01-10')
        }),
        createMockContact({ 
          id: 'contact-3', 
          name: 'No Contact',
          warmnessScore: 5,
          lastContacted: null
        }),
      ]

      // Act
      const sortedContacts = sortContactsForMy500(contacts)

      // Assert
      expect(sortedContacts[0].name).toBe('No Contact') // null dates first
      expect(sortedContacts[1].name).toBe('Old Contact')
      expect(sortedContacts[2].name).toBe('Recent Contact')
    })

    it('should prioritize existing customers', () => {
      // Arrange
      const contacts = [
        createMockContact({ 
          id: 'contact-1', 
          name: 'Prospect',
          warmnessScore: 3,
          lastContacted: new Date('2024-01-10'),
          organisation: 'Prospect Corp'
        }),
        createMockContact({ 
          id: 'contact-2', 
          name: 'Existing Customer',
          warmnessScore: 3,
          lastContacted: new Date('2024-01-10'),
          organisation: 'Customer Corp',
          addedToCampaign: true // Indicates existing customer
        }),
      ]

      // Act
      const sortedContacts = sortContactsForMy500(contacts)

      // Assert
      expect(sortedContacts[0].name).toBe('Existing Customer')
      expect(sortedContacts[1].name).toBe('Prospect')
    })

    it('should handle contacts with no activities', () => {
      // Arrange
      const contacts = [
        createMockContact({ 
          id: 'contact-1', 
          name: 'No Activity',
          warmnessScore: 0,
          lastContacted: null
        }),
        createMockContact({ 
          id: 'contact-2', 
          name: 'Some Activity',
          warmnessScore: 2,
          lastContacted: new Date('2024-01-10')
        }),
      ]

      // Act
      const sortedContacts = sortContactsForMy500(contacts)

      // Assert
      expect(sortedContacts[0].name).toBe('No Activity')
      expect(sortedContacts[1].name).toBe('Some Activity')
    })

    it('should return empty array for no contacts', () => {
      // Arrange
      const contacts: Contact[] = []

      // Act
      const sortedContacts = sortContactsForMy500(contacts)

      // Assert
      expect(sortedContacts).toEqual([])
    })
  })

  describe('getActivityStatus', () => {
    it('should return "cold" for contacts with no recent activity', () => {
      // Arrange
      const contact = createMockContact({
        warmnessScore: 0,
        lastContacted: null
      })

      // Act
      const status = getActivityStatus(contact)

      // Assert
      expect(status).toBe('cold')
    })

    it('should return "warm" for contacts with some activity', () => {
      // Arrange
      const contact = createMockContact({
        warmnessScore: 5,
        lastContacted: new Date('2024-01-10')
      })

      // Act
      const status = getActivityStatus(contact)

      // Assert
      expect(status).toBe('warm')
    })

    it('should return "hot" for contacts with high activity', () => {
      // Arrange
      const contact = createMockContact({
        warmnessScore: 8,
        lastContacted: new Date('2024-01-15')
      })

      // Act
      const status = getActivityStatus(contact)

      // Assert
      expect(status).toBe('hot')
    })

    it('should return "lost" for contacts with negative warmness', () => {
      // Arrange
      const contact = createMockContact({
        warmnessScore: -1,
        lastContacted: new Date('2024-01-10')
      })

      // Act
      const status = getActivityStatus(contact)

      // Assert
      expect(status).toBe('lost')
    })
  })

  describe('getDaysSinceLastContact', () => {
    it('should return null for contacts never contacted', () => {
      // Arrange
      const contact = createMockContact({
        lastContacted: null
      })

      // Act
      const days = getDaysSinceLastContact(contact)

      // Assert
      expect(days).toBeNull()
    })

    it('should calculate days since last contact', () => {
      // Arrange
      const contact = createMockContact({
        lastContacted: new Date('2024-01-10')
      })

      // Act
      const days = getDaysSinceLastContact(contact)

      // Assert
      expect(days).toBeGreaterThan(0)
      expect(typeof days).toBe('number')
    })
  })

  describe('getContactPriority', () => {
    it('should return high priority for existing customers', () => {
      // Arrange
      const contact = createMockContact({
        addedToCampaign: true,
        warmnessScore: 5
      })

      // Act
      const priority = getContactPriority(contact)

      // Assert
      expect(priority).toBe('high')
    })

    it('should return medium priority for warm prospects', () => {
      // Arrange
      const contact = createMockContact({
        addedToCampaign: false,
        warmnessScore: 5
      })

      // Act
      const priority = getContactPriority(contact)

      // Assert
      expect(priority).toBe('medium')
    })

    it('should return low priority for cold contacts', () => {
      // Arrange
      const contact = createMockContact({
        addedToCampaign: false,
        warmnessScore: 1
      })

      // Act
      const priority = getContactPriority(contact)

      // Assert
      expect(priority).toBe('low')
    })
  })
})

import { 
  sortContactsForMy500, 
  getActivityStatus, 
  getDaysSinceLastContact, 
  getContactPriority 
} from '@/lib/contactSorting' 