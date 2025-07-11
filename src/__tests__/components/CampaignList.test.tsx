import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CampaignList } from '@/components/campaigns/CampaignList'
import { Campaign, User } from '@prisma/client'

// Mock data
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CONSULTANT',
  password: 'hashed-password',
  pipedriveApiKey: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: null,
  image: null,
}

const mockCampaigns: Campaign[] = [
  {
    id: 'campaign-1',
    name: 'Q1 Lead Generation',
    description: 'Generate leads for Q1 sales',
    status: 'ACTIVE',
    sector: 'Technology',
    theme: 'Digital Transformation',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-03-31'),
    targetLeads: 100,
    budget: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign-2',
    name: 'Enterprise Outreach',
    description: 'Target enterprise companies',
    status: 'PLANNED',
    sector: 'Enterprise',
    theme: 'B2B Sales',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-06-30'),
    targetLeads: 50,
    budget: 3000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

describe('CampaignList', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders campaigns list correctly', () => {
    render(<CampaignList campaigns={mockCampaigns} user={mockUser} />)
    
    expect(screen.getByText('Q1 Lead Generation')).toBeInTheDocument()
    expect(screen.getByText('Enterprise Outreach')).toBeInTheDocument()
    expect(screen.getByText('Generate leads for Q1 sales')).toBeInTheDocument()
  })

  it('shows campaign status badges', () => {
    render(<CampaignList campaigns={mockCampaigns} user={mockUser} />)
    
    const activeBadges = screen.getAllByText('ACTIVE')
    const plannedBadges = screen.getAllByText('PLANNED')
    
    expect(activeBadges.length).toBeGreaterThan(0)
    expect(plannedBadges.length).toBeGreaterThan(0)
  })

  it('displays campaign metrics', () => {
    render(<CampaignList campaigns={mockCampaigns} user={mockUser} />)
    
    // Check for target leads (should be 2 instances - one for each campaign)
    const targetLeadsElements = screen.getAllByText('100')
    expect(targetLeadsElements[0]).toBeInTheDocument()
    
    // Check for budget formatting
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    expect(screen.getByText('$3,000.00')).toBeInTheDocument()
  })

  it('filters campaigns by status', async () => {
    render(<CampaignList campaigns={mockCampaigns} user={mockUser} />)
    
    // Get all status selects and use the first one
    const statusSelects = screen.getAllByLabelText('Filter campaigns by status')
    const statusSelect = statusSelects[0]
    
    // Change to ACTIVE filter
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } })
    
    // Wait for the filtering to take effect and verify only ACTIVE campaign is shown
    await waitFor(() => {
      expect(screen.getByText('Q1 Lead Generation')).toBeInTheDocument()
      expect(screen.queryByText('Enterprise Outreach')).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no campaigns', () => {
    render(<CampaignList campaigns={[]} user={mockUser} />)
    
    expect(screen.getByText('No campaigns found')).toBeInTheDocument()
    expect(screen.getByText('Create your first campaign to get started.')).toBeInTheDocument()
  })

  it('handles campaign actions', () => {
    const mockOnEdit = vi.fn()
    const mockOnDelete = vi.fn()
    
    render(
      <CampaignList 
        campaigns={mockCampaigns} 
        user={mockUser}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    const editButtons = screen.getAllByLabelText('Edit campaign')
    fireEvent.click(editButtons[0])
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockCampaigns[0])
  })
}) 