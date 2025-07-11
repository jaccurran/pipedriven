import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '../../setup'
import type { User } from '@prisma/client'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

describe('Pipedrive API Key API Route', () => {
  let mockUser: User

  beforeEach(async () => {
    // Clean up database
    await prisma.user.deleteMany({})

    // Create a test user
    mockUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'CONSULTANT',
      },
    })

    vi.clearAllMocks()
  })

  describe('PUT /api/user/pipedrive-api-key', () => {
    it('should update user Pipedrive API key when authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
        expires: new Date().toISOString(),
      })

      const { PUT } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key', {
        method: 'PUT',
        body: JSON.stringify({ apiKey: 'test-api-key-123' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Pipedrive API key updated successfully')
      expect(data.user.hasApiKey).toBe(true)

      // Verify database was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: mockUser.id },
      })
      expect(updatedUser?.pipedriveApiKey).toBe('test-api-key-123')
    })

    it('should return 401 when not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key', {
        method: 'PUT',
        body: JSON.stringify({ apiKey: 'test-api-key-123' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 400 when API key is missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
        expires: new Date().toISOString(),
      })

      const { PUT } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key', {
        method: 'PUT',
        body: JSON.stringify({}),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 400 when API key is empty string', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
        expires: new Date().toISOString(),
      })

      const { PUT } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key', {
        method: 'PUT',
        body: JSON.stringify({ apiKey: '' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle database errors gracefully', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'non-existent-id', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })

      const { PUT } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key', {
        method: 'PUT',
        body: JSON.stringify({ apiKey: 'test-api-key-123' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/user/pipedrive-api-key', () => {
    it('should return API key status when authenticated', async () => {
      // First set an API key
      await prisma.user.update({
        where: { id: mockUser.id },
        data: { pipedriveApiKey: 'test-api-key-123' },
      })

      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
        expires: new Date().toISOString(),
      })

      const { GET } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasApiKey).toBe(true)
      expect(data.user.id).toBe(mockUser.id)
      expect(data.user.email).toBe(mockUser.email)
    })

    it('should return false when no API key is set', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id, email: mockUser.email },
        expires: new Date().toISOString(),
      })

      const { GET } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasApiKey).toBe(false)
      expect(data.user.id).toBe(mockUser.id)
    })

    it('should return 401 when not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 404 when user not found', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'non-existent-id', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })

      const { GET } = await import('@/app/api/user/pipedrive-api-key/route')
      const request = new NextRequest('http://localhost:3000/api/user/pipedrive-api-key')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })
}) 