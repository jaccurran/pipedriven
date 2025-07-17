import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
// Use the standard Request object for API route tests
import { POST } from '../../../app/api/auth/validate-api-key/route'
import { prisma } from '../../../lib/prisma'

// Mock external dependencies at the top level
vi.mock('../../../lib/apiKeyEncryption', () => ({
  encryptApiKey: vi.fn().mockResolvedValue('encrypted-api-key')
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock Prisma client
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    }
  }
}))

describe('API Key Validation Route', () => {
  let mockUser: any

  beforeEach(async () => {
    // Set up encryption environment
    process.env.API_KEY_ENCRYPTION_SECRET = '12345678901234567890123456789012'

    // Set up mock user data
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      role: 'CONSULTANT',
      pipedriveApiKey: null,
    }

    // Reset all mocks to ensure clean state
    vi.clearAllMocks()

    // Set up Prisma mocks
    const { prisma } = await import('../../../lib/prisma')
    vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockUser,
      pipedriveApiKey: 'encrypted-api-key'
    })

    // Set up encryption mock for dynamic imports
    const { encryptApiKey } = await import('../../../lib/apiKeyEncryption')
    vi.mocked(encryptApiKey).mockResolvedValue('encrypted-api-key')

    // Mock PipedriveService.prototype.testConnection for each test
    const { PipedriveService } = await import('../../../server/services/pipedriveService')
    vi.spyOn(PipedriveService.prototype, 'testConnection').mockImplementation(function (this: any) {
      if (this.apiKey === 'valid-api-key') {
        return Promise.resolve({
          success: true,
          user: { 
            id: 1, 
            name: 'Test User', 
            email: 'test@example.com',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        })
      } else {
        return Promise.resolve({
          success: false,
          error: 'Invalid API key'
        })
      }
    })
  })

  it('should validate and save a valid API key', async () => {
    // Arrange: Set up authenticated session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email }
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'valid-api-key' })
    })

    // Act: Call the API route
    const response = await POST(request)
    const result = await response.json()
    


    // Assert: Verify the response
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.message).toBe('API key validated and saved successfully')
    expect(result.user).toEqual({ 
      id: 1, 
      name: 'Test User', 
      email: 'test@example.com',
      created: expect.any(String),
      updated: expect.any(String)
    })

    // Verify the API route called the database update with correct parameters
    const { prisma } = await import('../../../lib/prisma')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { pipedriveApiKey: 'encrypted-api-key' }
    })
  })

  it('should return 401 when not authenticated', async () => {
    // Arrange: Set up unauthenticated session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'valid-api-key' })
    })

    // Act: Call the API route
    const response = await POST(request)
    const result = await response.json()

    // Assert: Verify the response
    expect(response.status).toBe(401)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Authentication required')
  })

  it('should return 400 when API key is missing', async () => {
    // Arrange: Set up authenticated session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email }
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    // Act: Call the API route
    const response = await POST(request)
    const result = await response.json()

    // Assert: Verify the response
    expect(response.status).toBe(400)
    expect(result.success).toBe(false)
    expect(result.error).toBe('API key is required')
  })

  it('should return 400 when API key is empty string', async () => {
    // Arrange: Set up authenticated session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email }
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' })
    })

    // Act: Call the API route
    const response = await POST(request)
    const result = await response.json()

    // Assert: Verify the response
    expect(response.status).toBe(400)
    expect(result.success).toBe(false)
    expect(result.error).toBe('API key is required')
  })

  it('should return 400 when API key is invalid', async () => {
    // Arrange: Set up authenticated session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email }
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'invalid-api-key' })
    })

    // Act: Call the API route
    const response = await POST(request)
    const result = await response.json()

    // Assert: Verify the response
    expect(response.status).toBe(400)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid API key')
  })

  it('should handle encryption errors gracefully', async () => {
    // Arrange: Set up authenticated session and mock encryption error
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email }
    } as any)

    const { encryptApiKey } = await import('../../../lib/apiKeyEncryption')
    vi.mocked(encryptApiKey).mockRejectedValueOnce(new Error('Encryption failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'valid-api-key' })
    })

    // Act: Call the API route
    const response = await POST(request)
    const result = await response.json()

    // Assert: Verify the response
    expect(response.status).toBe(500)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to validate API key')
  })

  it('should handle database errors gracefully', async () => {
    // Arrange: Set up authenticated session with non-existent user
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'non-existent-id', email: 'test@example.com' }
    } as any)

    // Mock prisma.user.update to throw an error
    const { prisma } = await import('../../../lib/prisma')
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/auth/validate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'valid-api-key' })
    })

    // Act: Call the API route
    const response = await POST(request)
    const result = await response.json()

    // Assert: Verify the response
    expect(response.status).toBe(500)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to validate API key')
  })
}) 