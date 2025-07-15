import '@testing-library/jest-dom/vitest';
import * as React from 'react'
import { PrismaClient } from '@prisma/client'
import { beforeEach, afterEach, afterAll, vi } from 'vitest'

// Make React available globally for JSX
global.React = React

// Mock fetch globally
global.fetch = vi.fn()

// Mock next/navigation for client components
vi.mock('next/navigation', () => ({
  usePathname: () => '/test-path',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next-auth/react useSession for client components
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Create a single Prisma client instance for testing
// Use the same DATABASE_URL that vitest configures
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

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