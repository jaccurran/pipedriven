// Mock the ContactService
vi.mock('@/server/services/contactService')
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock the Pipedrive service
vi.mock('@/server/services/pipedriveService', () => ({
  createPipedriveService: vi.fn(),
}))

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/contacts/route'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import { createPipedriveService } from '@/server/services/pipedriveService'
import type { Contact, User } from '@prisma/client'

const mockContactService = vi.mocked(ContactService)
const mockGetServerSession = vi.mocked(getServerSession)
const mockCreatePipedriveService = vi.mocked(createPipedriveService)

describe('/api/contacts', () => {
  let mockContactServiceInstance: any
  let mockUser: User
  let mockContact: Contact

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

    mockContactServiceInstance = {
      getContacts: vi.fn(),
      createContact: vi.fn(),
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

  describe('GET /api/contacts', () => {
    it('should return contacts with pagination', async () => {
      // Arrange
      const mockResponse = {
        contacts: [mockContact],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      }

      mockContactServiceInstance.getContacts.mockResolvedValue(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/contacts')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.contacts).toHaveLength(1)
      expect(data.contacts[0].name).toBe(mockResponse.contacts[0].name)
      expect(data.pagination).toEqual(mockResponse.pagination)
      expect(mockContactServiceInstance.getContacts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        userId: mockUser.id,
        query: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        country: undefined,
        sector: undefined,
      })
    })

    it('should handle query parameters for filtering', async () => {
      // Arrange
      const mockResponse = {
        contacts: [mockContact],
        pagination: {
          page: 2,
          limit: 5,
          total: 1,
          totalPages: 1,
        },
      }

      mockContactServiceInstance.getContacts.mockResolvedValue(mockResponse)

      const request = new NextRequest(
        'http://localhost:3000/api/contacts?page=2&limit=5&name=John&email=john@example.com&organisation=Acme&minWarmnessScore=3&maxWarmnessScore=7&campaignId=campaign-123&addedToCampaign=true'
      )

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.contacts).toHaveLength(1)
      expect(data.contacts[0].name).toBe(mockResponse.contacts[0].name)
      expect(data.pagination).toEqual(mockResponse.pagination)
      expect(mockContactServiceInstance.getContacts).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        userId: mockUser.id,
        query: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        country: undefined,
        sector: undefined,
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/contacts')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockContactServiceInstance.getContacts).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockContactServiceInstance.getContacts.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/contacts')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should validate query parameters', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/contacts?page=invalid&limit=invalid&minWarmnessScore=invalid&maxWarmnessScore=invalid'
      )

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid query parameters' })
      expect(mockContactServiceInstance.getContacts).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/contacts', () => {
    it('should create a contact successfully', async () => {
      // Arrange
      const contactData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        organisation: 'Tech Solutions',
        warmnessScore: 3,
      }

      mockContactServiceInstance.createContact.mockResolvedValue({
        ...mockContact,
        ...contactData,
      })

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe(contactData.name)
      expect(data.email).toBe(contactData.email)
      expect(data.phone).toBe(contactData.phone)
      expect(data.organisation).toBe(contactData.organisation)
      expect(data.warmnessScore).toBe(contactData.warmnessScore)
      expect(mockContactServiceInstance.createContact).toHaveBeenCalledWith({
        ...contactData,
        userId: mockUser.id,
      })
    })

    it('should create a contact with minimal data', async () => {
      // Arrange
      const contactData = {
        name: 'Minimal Contact',
      }

      mockContactServiceInstance.createContact.mockResolvedValue({
        ...mockContact,
        ...contactData,
        email: null,
        phone: null,
        organisation: null,
        warmnessScore: 0,
      })

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe('Minimal Contact')
      expect(mockContactServiceInstance.createContact).toHaveBeenCalledWith({
        ...contactData,
        userId: mockUser.id,
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const contactData = { name: 'Test Contact' }
      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockContactServiceInstance.createContact).not.toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        phone: 'invalid-phone',
        warmnessScore: 11, // Should be 0-10
      }

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Name is required' })
      expect(mockContactServiceInstance.createContact).not.toHaveBeenCalled()
    })

    it('should handle missing name field', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
      }

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Name is required' })
      expect(mockContactServiceInstance.createContact).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const contactData = { name: 'Test Contact' }
      mockContactServiceInstance.createContact.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should handle invalid JSON body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid JSON' })
      expect(mockContactServiceInstance.createContact).not.toHaveBeenCalled()
    })

    it('should create a contact with last contacted date from Pipedrive', async () => {
      // Arrange
      const contactData = {
        name: 'Pipedrive Contact',
        email: 'pipedrive@example.com',
        pipedrivePersonId: '12345',
      }

      const mockPipedriveService = {
        getLastContactedDate: vi.fn().mockResolvedValue({
          success: true,
          lastContacted: new Date('2024-01-15T10:30:00Z'),
        }),
      }

      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService as any)
      mockContactServiceInstance.createContact.mockResolvedValue({
        ...mockContact,
        ...contactData,
        lastContacted: new Date('2024-01-15T10:30:00Z'),
      })

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe(contactData.name)
      expect(data.pipedrivePersonId).toBe('12345')
      expect(data.lastContacted).toBeDefined()
      expect(new Date(data.lastContacted)).toEqual(new Date('2024-01-15T10:30:00Z'))

      // Verify Pipedrive service was called
      expect(mockCreatePipedriveService).toHaveBeenCalledWith(mockUser.id)
      expect(mockPipedriveService.getLastContactedDate).toHaveBeenCalledWith(12345)
      expect(mockContactServiceInstance.createContact).toHaveBeenCalledWith({
        ...contactData,
        lastContacted: new Date('2024-01-15T10:30:00Z'),
        userId: mockUser.id,
      })
    })

    it('should create a contact without last contacted date when Pipedrive service fails', async () => {
      // Arrange
      const contactData = {
        name: 'Failed Pipedrive Contact',
        email: 'failed@example.com',
        pipedrivePersonId: '67890',
      }

      const mockPipedriveService = {
        getLastContactedDate: vi.fn().mockResolvedValue({
          success: false,
          error: 'API error',
        }),
      }

      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService as any)
      mockContactServiceInstance.createContact.mockResolvedValue({
        ...mockContact,
        ...contactData,
        lastContacted: null,
      })

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe(contactData.name)
      expect(data.pipedrivePersonId).toBe('67890')
      expect(data.lastContacted).toBeNull()

      // Verify Pipedrive service was still called
      expect(mockCreatePipedriveService).toHaveBeenCalledWith(mockUser.id)
      expect(mockPipedriveService.getLastContactedDate).toHaveBeenCalledWith(67890)
      expect(mockContactServiceInstance.createContact).toHaveBeenCalledWith({
        ...contactData,
        lastContacted: undefined,
        userId: mockUser.id,
      })
    })

    it('should handle invalid pipedrivePersonId gracefully', async () => {
      // Arrange
      const contactData = {
        name: 'Invalid Pipedrive Contact',
        email: 'invalid@example.com',
        pipedrivePersonId: 'not-a-number',
      }

      const mockPipedriveService = {
        getLastContactedDate: vi.fn(),
      }

      mockCreatePipedriveService.mockResolvedValue(mockPipedriveService as any)
      mockContactServiceInstance.createContact.mockResolvedValue({
        ...mockContact,
        ...contactData,
        lastContacted: null,
      })

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe(contactData.name)
      expect(data.pipedrivePersonId).toBe('not-a-number')
      expect(data.lastContacted).toBeNull()

      // Verify Pipedrive service was created but getLastContactedDate was not called due to invalid ID
      expect(mockCreatePipedriveService).toHaveBeenCalledWith(mockUser.id)
      expect(mockPipedriveService.getLastContactedDate).not.toHaveBeenCalled()
      expect(mockContactServiceInstance.createContact).toHaveBeenCalledWith({
        ...contactData,
        lastContacted: undefined,
        userId: mockUser.id,
      })
    })

    it('should continue contact creation when Pipedrive service throws an error', async () => {
      // Arrange
      const contactData = {
        name: 'Error Pipedrive Contact',
        email: 'error@example.com',
        pipedrivePersonId: '99999',
      }

      mockCreatePipedriveService.mockRejectedValue(new Error('Pipedrive service error'))
      mockContactServiceInstance.createContact.mockResolvedValue({
        ...mockContact,
        ...contactData,
        lastContacted: null,
      })

      const request = new NextRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe(contactData.name)
      expect(data.pipedrivePersonId).toBe('99999')
      expect(data.lastContacted).toBeNull()

      // Verify contact creation still succeeded
      expect(mockContactServiceInstance.createContact).toHaveBeenCalledWith({
        ...contactData,
        lastContacted: undefined,
        userId: mockUser.id,
      })
    })
  })
}) 