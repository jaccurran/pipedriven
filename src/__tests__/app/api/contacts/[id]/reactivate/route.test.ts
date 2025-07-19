import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'

// Mock dependencies
vi.mock('@/server/services/contactService')
vi.mock('@/lib/auth')

// Import mocked modules
import { ContactService as MockedContactService } from '@/server/services/contactService'
import { getServerSession as mockGetServerSession } from '@/lib/auth'

// Test data factories
function createMockContact(overrides: any = {}) {
  return {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john@example.com',
    isActive: false,
    pipedrivePersonId: '123',
    ...overrides,
  }
}

function createMockUser(overrides: any = {}) {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  }
}

describe('POST /api/contacts/[id]/reactivate', () => {
  let mockContactService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockContactService = {
      reactivateContact: vi.fn(),
    }
    vi.mocked(MockedContactService).mockImplementation(() => mockContactService)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should successfully reactivate a contact', async () => {
    // Arrange
    const mockUser = createMockUser()
    const mockSession = { user: mockUser }
    vi.mocked(mockGetServerSession).mockResolvedValue(mockSession as any)

    const mockResult = {
      success: true,
      data: {
        contactId: 'contact-1',
        pipedriveUpdated: true,
        localUpdated: true,
        activityId: 'activity-1',
      },
    }
    mockContactService.reactivateContact.mockResolvedValue(mockResult)

    const requestBody = {
      reason: 'Contact re-engaged',
      syncToPipedrive: true,
    }

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.contactId).toBe('contact-1')
    expect(mockContactService.reactivateContact).toHaveBeenCalledWith(
      'contact-1',
      'user-1',
      requestBody
    )
  })

  it('should return 401 when not authenticated', async () => {
    // Arrange
    vi.mocked(mockGetServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 400 when request body is invalid JSON', async () => {
    // Arrange
    const mockUser = createMockUser()
    const mockSession = { user: mockUser }
    vi.mocked(mockGetServerSession).mockResolvedValue(mockSession as any)

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid JSON in request body')
  })

  it('should return 400 when validation fails', async () => {
    // Arrange
    const mockUser = createMockUser()
    const mockSession = { user: mockUser }
    vi.mocked(mockGetServerSession).mockResolvedValue(mockSession as any)

    const requestBody = {
      syncToPipedrive: 'invalid', // Should be boolean
    }

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid request data')
  })

  it('should return 404 when contact not found', async () => {
    // Arrange
    const mockUser = createMockUser()
    const mockSession = { user: mockUser }
    vi.mocked(mockGetServerSession).mockResolvedValue(mockSession as any)

    const mockResult = {
      success: false,
      error: 'Contact not found',
    }
    mockContactService.reactivateContact.mockResolvedValue(mockResult)

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Contact not found')
  })

  it('should return 400 when contact is already active', async () => {
    // Arrange
    const mockUser = createMockUser()
    const mockSession = { user: mockUser }
    vi.mocked(mockGetServerSession).mockResolvedValue(mockSession as any)

    const mockResult = {
      success: false,
      error: 'Contact is already active',
    }
    mockContactService.reactivateContact.mockResolvedValue(mockResult)

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Contact is already active')
  })

  it('should return 500 when service throws an error', async () => {
    // Arrange
    const mockUser = createMockUser()
    const mockSession = { user: mockUser }
    vi.mocked(mockGetServerSession).mockResolvedValue(mockSession as any)

    mockContactService.reactivateContact.mockRejectedValue(new Error('Service error'))

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should use default values when optional fields are not provided', async () => {
    // Arrange
    const mockUser = createMockUser()
    const mockSession = { user: mockUser }
    vi.mocked(mockGetServerSession).mockResolvedValue(mockSession as any)

    const mockResult = {
      success: true,
      data: {
        contactId: 'contact-1',
        pipedriveUpdated: true,
        localUpdated: true,
        activityId: 'activity-1',
      },
    }
    mockContactService.reactivateContact.mockResolvedValue(mockResult)

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-1/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    // Act
    const { POST } = await import('@/app/api/contacts/[id]/reactivate/route')
    const response = await POST(request, { params: Promise.resolve({ id: 'contact-1' }) })

    // Assert
    expect(response.status).toBe(200)
    expect(mockContactService.reactivateContact).toHaveBeenCalledWith(
      'contact-1',
      'user-1',
      {
        reason: undefined,
        syncToPipedrive: true,
      }
    )
  })
}) 