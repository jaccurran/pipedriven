import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { prisma } from '@/__tests__/setup'
import CampaignDetailPage from '@/app/campaigns/[id]/page'
import { Campaign, User } from '@prisma/client'

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  usePathname: () => '/test-path',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Don't mock @/lib/prisma - use the real one from setup

describe('Campaign Detail Page', () => {
  let mockCampaign: Campaign
  let mockUser: User

  beforeEach(async () => {
    // Clean up database
    await prisma.activity.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.campaign.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    mockUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        role: 'CONSULTANT',
      },
    })

    // Create test campaign
    mockCampaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign',
        description: 'A test campaign for TDD',
        status: 'ACTIVE',
        sector: 'Technology',
        theme: 'Digital Transformation',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
        targetLeads: 50,
        budget: 10000.00,
        users: {
          connect: { id: mockUser.id }
        }
      },
    })
  })

  it('should display campaign details when campaign exists and user has access', async () => {
    // Mock session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
      expires: new Date().toISOString(),
    })

    // Render the page
    const Page = await CampaignDetailPage({ params: { id: mockCampaign.id } })
    render(Page)

    // Assertions
    expect(screen.getByText('Test Campaign')).toBeInTheDocument()
    expect(screen.getByText('A test campaign for TDD')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('Digital Transformation')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument() // Target leads
    expect(screen.getByText('$10,000.00')).toBeInTheDocument() // Budget
  })

  it('should redirect to signin when user is not authenticated', async () => {
    // Mock no session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { redirect } = await import('next/navigation')
    
    // This should trigger redirect - wrap in try/catch since redirect throws
    try {
      await CampaignDetailPage({ params: { id: mockCampaign.id } })
    } catch (error) {
      // Expected to throw due to redirect
    }
    
    expect(redirect).toHaveBeenCalledWith('/auth/signin')
  })

  it('should show 404 when campaign does not exist', async () => {
    // Mock session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
      expires: new Date().toISOString(),
    })

    const { notFound } = await import('next/navigation')
    
    // This should trigger notFound
    await CampaignDetailPage({ params: { id: 'non-existent-id' } })
    
    expect(notFound).toHaveBeenCalled()
  })

  it('should show 404 when user does not have access to campaign', async () => {
    // Create another user
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other User',
        email: 'other@example.com',
        role: 'CONSULTANT',
      },
    })

    // Mock session with other user
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: otherUser.id, email: otherUser.email, name: otherUser.name },
      expires: new Date().toISOString(),
    })

    const { notFound } = await import('next/navigation')
    
    // This should trigger notFound
    await CampaignDetailPage({ params: { id: mockCampaign.id } })
    
    expect(notFound).toHaveBeenCalled()
  })

  it('should display campaign statistics', async () => {
    // Create some contacts and activities for the campaign
    const contact = await prisma.contact.create({
      data: {
        name: 'Test Contact',
        email: 'contact@example.com',
        organisation: 'Test Org',
        userId: mockUser.id,
        campaigns: {
          connect: { id: mockCampaign.id }
        }
      },
    })

    await prisma.activity.create({
      data: {
        type: 'EMAIL',
        subject: 'Test Activity',
        userId: mockUser.id,
        campaignId: mockCampaign.id,
        contactId: contact.id,
      },
    })

    // Mock session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
      expires: new Date().toISOString(),
    })

    // Use real Prisma data - no mocking needed

    // Render the page
    const Page = await CampaignDetailPage({ params: { id: mockCampaign.id } })
    render(Page)

    // Assertions for statistics - use more specific selectors
    const contactCountElements = screen.getAllByText('1')
    expect(contactCountElements.length).toBeGreaterThan(0)
    
    // Check that we have both contact and activity counts using more specific selectors
    const contactHeaders = screen.getAllByText('Contacts')
    const activityHeaders = screen.getAllByText('Activities')
    expect(contactHeaders.length).toBeGreaterThan(0)
    expect(activityHeaders.length).toBeGreaterThan(0)
  })
}) 