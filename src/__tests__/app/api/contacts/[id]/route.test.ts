// Mock the ContactService
vi.mock('@/server/services/contactService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/contacts/[id]/route'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import type { Contact, User, Activity, Campaign } from '@prisma/client'

const mockContactService = vi.mocked(ContactService)
const mockGetServerSession = vi.mocked(getServerSession)

describe('/api/contacts/[id]', () => {
  let mockContactServiceInstance: any
  let mockUser: User
  let mockContact: Contact
  let mockContactWithRelations: Contact & {
    activities: Activity[]
    campaigns: Campaign[]
    user: User
  }

  beforeEach(() => {
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

    mockContactWithRelations = {
      ...mockContact,
      activities: [],
      campaigns: [],
      user: mockUser,
    }

    mockContactServiceInstance = {
      getContactById: vi.fn(),
      updateContact: vi.fn(),
      deleteContact: vi.fn(),
    }

    mockContactService.mockImplementation(() => mockContactServiceInstance)
    mockGetServerSession.mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/contacts/[id]', () => {
    it('should return contact by ID with relations', async () => {
      // Arrange
      mockContactServiceInstance.getContactById.mockResolvedValue(mockContactWithRelations)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123')

      // Act
      const response = await GET(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.name).toBe(mockContactWithRelations.name)
      expect(data.email).toBe(mockContactWithRelations.email)
      expect(data.activities).toEqual([])
      expect(data.campaigns).toEqual([])
      expect(data.user).toBeDefined()
      expect(mockContactServiceInstance.getContactById).toHaveBeenCalledWith('contact-123')
    })

    it('should return 404 when contact not found', async () => {
      // Arrange
      mockContactServiceInstance.getContactById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/contacts/non-existent')

      // Act
      const response = await GET(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Contact not found' })
      expect(mockContactServiceInstance.getContactById).toHaveBeenCalledWith('non-existent')
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123')

      // Act
      const response = await GET(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockContactServiceInstance.getContactById).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockContactServiceInstance.getContactById.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123')

      // Act
      const response = await GET(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })

  describe('PUT /api/contacts/[id]', () => {
    it('should update contact successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        warmnessScore: 8,
      }

      const updatedContact = { ...mockContact, ...updateData }
      mockContactServiceInstance.updateContact.mockResolvedValue(updatedContact)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.name).toBe(updateData.name)
      expect(data.email).toBe(updateData.email)
      expect(data.warmnessScore).toBe(updateData.warmnessScore)
      expect(mockContactServiceInstance.updateContact).toHaveBeenCalledWith('contact-123', updateData)
    })

    it('should return 404 when contact not found', async () => {
      // Arrange
      mockContactServiceInstance.updateContact.mockRejectedValue(new Error('Contact not found'))

      const updateData = { name: 'Updated Name' }
      const request = new NextRequest('http://localhost:3000/api/contacts/non-existent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Contact not found' })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const updateData = { name: 'Updated Name' }
      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockContactServiceInstance.updateContact).not.toHaveBeenCalled()
    })

    it('should validate update data', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        warmnessScore: 11, // Should be 0-10
      }

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Validation failed' })
      expect(mockContactServiceInstance.updateContact).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // Act
      const response = await PUT(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid JSON' })
      expect(mockContactServiceInstance.updateContact).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockContactServiceInstance.updateContact.mockRejectedValue(new Error('Database error'))

      const updateData = { name: 'Updated Name' }
      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // Act
      const response = await PUT(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })

  describe('DELETE /api/contacts/[id]', () => {
    it('should delete contact successfully', async () => {
      // Arrange
      mockContactServiceInstance.deleteContact.mockResolvedValue(mockContact)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ message: 'Contact deleted successfully' })
      expect(mockContactServiceInstance.deleteContact).toHaveBeenCalledWith('contact-123')
    })

    it('should return 404 when contact not found', async () => {
      // Arrange
      mockContactServiceInstance.deleteContact.mockRejectedValue(new Error('Contact not found'))

      const request = new NextRequest('http://localhost:3000/api/contacts/non-existent', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Contact not found' })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockContactServiceInstance.deleteContact).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockContactServiceInstance.deleteContact.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/contacts/contact-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: { id: 'contact-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })
}) 