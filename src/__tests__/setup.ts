import '@testing-library/jest-dom/vitest';
import * as React from 'react'
import { PrismaClient } from '@prisma/client'
import { beforeEach, afterEach, afterAll, vi } from 'vitest'

// Make React available globally for JSX
global.React = React

// Mock fetch globally
global.fetch = vi.fn()

// Create a single Prisma client instance for testing
const prisma = new PrismaClient()

// Only clean up database if we're explicitly running tests
// This prevents accidental data loss during development
const shouldCleanDatabase = process.env.NODE_ENV === 'test' || process.env.VITEST

// Clean up database before each test for proper isolation
beforeEach(async () => {
  if (shouldCleanDatabase) {
    // Clean up any existing data in the correct order (respecting foreign key constraints)
    await prisma.pipedriveSync.deleteMany()
    await prisma.activity.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.campaign.deleteMany()
    await prisma.user.deleteMany()
  }
  
  // Reset fetch mock before each test to ensure clean state
  vi.resetAllMocks()
})

// Clean up after each test
afterEach(async () => {
  // Additional cleanup if needed
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Export prisma instance for use in tests
export { prisma } 