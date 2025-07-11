import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../setup'
import type { User, UserRole } from '@prisma/client'

describe('User Model', () => {
  beforeEach(async () => {
    // Test setup - cleanup handled globally
  })

  describe('User Creation', () => {
    it('should create a user with required fields', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'CONSULTANT' as UserRole,
      }

      // Act
      const user = await prisma.user.create({
        data: userData,
      })

      // Assert
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.name).toBe(userData.name)
      expect(user.role).toBe(userData.role)
      expect(user.pipedriveApiKey).toBeNull()
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a user with optional Pipedrive API key', async () => {
      // Arrange
      const userData = {
        email: 'consultant@example.com',
        name: 'Consultant User',
        role: 'CONSULTANT' as UserRole,
        pipedriveApiKey: 'test-api-key-123',
      }

      // Act
      const user = await prisma.user.create({
        data: userData,
      })

      // Assert
      expect(user.pipedriveApiKey).toBe(userData.pipedriveApiKey)
    })

    it('should create a Golden Ticket user', async () => {
      // Arrange
      const userData = {
        email: 'golden@example.com',
        name: 'Golden Ticket User',
        role: 'GOLDEN_TICKET' as UserRole,
      }

      // Act
      const user = await prisma.user.create({
        data: userData,
      })

      // Assert
      expect(user.role).toBe('GOLDEN_TICKET')
    })

    it('should enforce unique email constraint', async () => {
      // Arrange
      const userData = {
        email: 'duplicate@example.com',
        name: 'First User',
        role: 'CONSULTANT' as UserRole,
      }

      // Create first user
      await prisma.user.create({
        data: userData,
      })

      // Act & Assert - Attempt to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            ...userData,
            name: 'Second User',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('User Retrieval', () => {
    it('should retrieve a user by ID', async () => {
      // Arrange
      const createdUser = await prisma.user.create({
        data: {
          email: 'retrieve@example.com',
          name: 'Retrieve User',
          role: 'CONSULTANT' as UserRole,
        },
      })

      // Act
      const retrievedUser = await prisma.user.findUnique({
        where: { id: createdUser.id },
      })

      // Assert
      expect(retrievedUser).toBeDefined()
      expect(retrievedUser?.id).toBe(createdUser.id)
      expect(retrievedUser?.email).toBe(createdUser.email)
    })

    it('should retrieve a user by email', async () => {
      // Arrange
      const createdUser = await prisma.user.create({
        data: {
          email: 'email@example.com',
          name: 'Email User',
          role: 'CONSULTANT' as UserRole,
        },
      })

      // Act
      const retrievedUser = await prisma.user.findUnique({
        where: { email: createdUser.email },
      })

      // Assert
      expect(retrievedUser).toBeDefined()
      expect(retrievedUser?.id).toBe(createdUser.id)
    })

    it('should return null for non-existent user', async () => {
      // Act
      const user = await prisma.user.findUnique({
        where: { id: 'non-existent-id' },
      })

      // Assert
      expect(user).toBeNull()
    })
  })

  describe('User Updates', () => {
    it('should update user information', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'update@example.com',
          name: 'Original Name',
          role: 'CONSULTANT' as UserRole,
        },
      })

      // Act
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Updated Name',
          pipedriveApiKey: 'new-api-key',
        },
      })

      // Assert
      expect(updatedUser.name).toBe('Updated Name')
      expect(updatedUser.pipedriveApiKey).toBe('new-api-key')
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(user.updatedAt.getTime())
    })
  })

  describe('User Deletion', () => {
    it('should delete a user', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'delete@example.com',
          name: 'Delete User',
          role: 'CONSULTANT' as UserRole,
        },
      })

      // Act
      await prisma.user.delete({
        where: { id: user.id },
      })

      // Assert
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      })
      expect(deletedUser).toBeNull()
    })
  })
}) 