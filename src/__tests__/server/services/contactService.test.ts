import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ContactService } from '@/server/services/contactService'
import type { Contact, Activity, User } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaign: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/server/services/pipedriveService', () => ({
  createPipedriveService: vi.fn(),
}))

// Import mocked modules
import { prisma } from '@/lib/prisma'
import { createPipedriveService } from '@/server/services/pipedriveService'

// Test data factories
function createMockContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    organisation: 'Tech Corp',
    organizationId: 'org-1',
    warmnessScore: 5,
    lastContacted: new Date('2024-01-15'),
    addedToCampaign: false,
    pipedrivePersonId: '123',
    pipedriveOrgId: '456',
    lastPipedriveUpdate: new Date('2024-01-15'),
    isActive: true,
    deactivatedAt: null,
    deactivatedBy: null,
    deactivationReason: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    userId: 'user-1',
    ...overrides,
  } as Contact
}

function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    type: 'EMAIL',
    subject: 'Test activity',
    note: 'Test note',
    dueDate: null,
    pipedriveActivityId: null,
    isSystemActivity: false,
    systemAction: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    userId: 'user-1',
    contactId: 'contact-1',
    campaignId: null,
    ...overrides,
  } as Activity
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'CONSULTANT',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    password: null,
    pipedriveApiKey: 'test-api-key',
    lastSyncTimestamp: new Date('2024-01-15'),
    syncStatus: 'SYNCED',
    emailVerified: null,
    image: null,
    ...overrides,
  } as User
}

describe('ContactService', () => {
  let contactService: ContactService

  beforeEach(() => {
    vi.clearAllMocks()
    contactService = new ContactService()
    
    // Set up default mocks
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('deactivateContact', () => {
    const defaultOptions = {
      reason: 'Test deactivation',
      removeFromSystem: false,
      syncToPipedrive: true,
    }

    it('should successfully deactivate a contact', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true, pipedrivePersonId: '123' })
      const mockUser = createMockUser({ id: 'user-1' })
      
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockResolvedValue({ ...mockContact, isActive: false })
      vi.mocked(prisma.activity.create).mockResolvedValue(createMockActivity())
      vi.mocked(createPipedriveService).mockResolvedValue({
        deactivateContact: vi.fn().mockResolvedValue({ success: true })
      } as any)

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1', {
        reason: 'No longer interested',
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.contactId).toBe('contact-1')
      expect(result.data?.pipedriveUpdated).toBe(true)
      expect(result.data?.localUpdated).toBe(true)
      expect(result.data?.activityId).toBeDefined()

      // Verify database calls
      expect(prisma.contact.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'contact-1',
          userId: 'user-1'
        }
      })

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: {
          isActive: false,
          deactivatedAt: expect.any(Date),
          deactivatedBy: 'user-1',
          deactivationReason: 'No longer interested'
        }
      })

      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: {
          type: 'EMAIL',
          subject: 'Contact Deactivated',
          note: 'Contact John Doe was deactivated. Reason: No longer interested',
          userId: 'user-1',
          contactId: 'contact-1',
          isSystemActivity: true,
          systemAction: 'DEACTIVATE'
        }
      })
    })

    it('should fail when contact not found', async () => {
      // Arrange
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(null)

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Contact not found')
    })

    it('should fail when contact already inactive', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: false })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Contact is already inactive')
    })

    it('should fail when contact has pending activities', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true })
      const mockActivity = createMockActivity({ dueDate: new Date('2024-12-31') })
      
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.activity.findMany).mockResolvedValue([mockActivity])

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot deactivate contact with pending activities')
    })

    it('should fail when Pipedrive service creation fails', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true, pipedrivePersonId: '123' })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(createPipedriveService).mockResolvedValue(null)

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1', {
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create Pipedrive service - check API key configuration')
    })

    it('should fail when Pipedrive update fails', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true, pipedrivePersonId: '123' })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(createPipedriveService).mockResolvedValue({
        deactivateContact: vi.fn().mockResolvedValue({ 
          success: false, 
          error: 'Custom field not found' 
        })
      } as any)

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1', {
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update Pipedrive: Custom field not found')
    })

    it('should succeed with local-only deactivation when Pipedrive sync is disabled', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockResolvedValue({ ...mockContact, isActive: false })
      vi.mocked(prisma.activity.create).mockResolvedValue(createMockActivity())

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1', {
        syncToPipedrive: false
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.pipedriveUpdated).toBe(false)
      expect(result.data?.localUpdated).toBe(true)
    })

    it('should succeed when contact has no Pipedrive ID', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true, pipedrivePersonId: null })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockResolvedValue({ ...mockContact, isActive: false })
      vi.mocked(prisma.activity.create).mockResolvedValue(createMockActivity())

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1', {
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.pipedriveUpdated).toBe(false)
      expect(result.data?.localUpdated).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true, pipedrivePersonId: null })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockRejectedValue(new Error('Database error'))

      // Act
      const result = await contactService.deactivateContact('contact-1', 'user-1')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('reactivateContact', () => {
    const defaultOptions = {
      reason: 'Test reactivation',
      syncToPipedrive: true,
    }

    it('should successfully reactivate a contact', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: false, pipedrivePersonId: '123' })
      const mockUser = createMockUser({ id: 'user-1' })
      
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockResolvedValue({ ...mockContact, isActive: true })
      vi.mocked(prisma.activity.create).mockResolvedValue(createMockActivity())
      vi.mocked(createPipedriveService).mockResolvedValue({
        reactivateContact: vi.fn().mockResolvedValue({ success: true })
      } as any)

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1', {
        reason: 'Re-engaged',
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.contactId).toBe('contact-1')
      expect(result.data?.pipedriveUpdated).toBe(true)
      expect(result.data?.localUpdated).toBe(true)
      expect(result.data?.activityId).toBeDefined()

      // Verify database calls
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: {
          isActive: true,
          deactivatedAt: null,
          deactivatedBy: null,
          deactivationReason: null,
          deletedAt: null
        }
      })

      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: {
          type: 'EMAIL',
          subject: 'Contact Reactivated',
          note: 'Contact John Doe was reactivated. Reason: Re-engaged',
          userId: 'user-1',
          contactId: 'contact-1',
          isSystemActivity: true,
          systemAction: 'REACTIVATE'
        }
      })
    })

    it('should fail when contact is already active', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: true })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Contact is already active')
    })

    it('should fail when contact not found', async () => {
      // Arrange
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(null)

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Contact not found')
    })

    it('should fail when Pipedrive service creation fails', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: false, pipedrivePersonId: '123' })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(createPipedriveService).mockResolvedValue(null)

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1', {
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create Pipedrive service - check API key configuration')
    })

    it('should fail when Pipedrive update fails', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: false, pipedrivePersonId: '123' })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(createPipedriveService).mockResolvedValue({
        reactivateContact: vi.fn().mockResolvedValue({ 
          success: false, 
          error: 'Custom field not found' 
        })
      } as any)

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1', {
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update Pipedrive: Custom field not found')
    })

    it('should succeed with local-only reactivation when Pipedrive sync is disabled', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: false })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockResolvedValue({ ...mockContact, isActive: true })
      vi.mocked(prisma.activity.create).mockResolvedValue(createMockActivity())

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1', {
        syncToPipedrive: false
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.pipedriveUpdated).toBe(false)
      expect(result.data?.localUpdated).toBe(true)
    })

    it('should succeed when contact has no Pipedrive ID', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: false, pipedrivePersonId: null })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockResolvedValue({ ...mockContact, isActive: true })
      vi.mocked(prisma.activity.create).mockResolvedValue(createMockActivity())

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1', {
        syncToPipedrive: true
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.pipedriveUpdated).toBe(false)
      expect(result.data?.localUpdated).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockContact = createMockContact({ isActive: false, pipedrivePersonId: null })
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
      vi.mocked(prisma.contact.update).mockRejectedValue(new Error('Database error'))

      // Act
      const result = await contactService.reactivateContact('contact-1', 'user-1')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })
}) 