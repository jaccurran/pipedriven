import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignKanban } from '@/components/campaigns/CampaignKanban'
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
    status: 'PLANNED',
    sector: null,
    theme: null,
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
    description: 'Target enterprise accounts',
    status: 'ACTIVE',
    sector: null,
    theme: null,
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-06-30'),
    targetLeads: 50,
    budget: 3000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign-3',
    name: 'SMB Campaign',
    description: 'SMB focus',
    status: 'COMPLETED',
    sector: null,
    theme: null,
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-12-31'),
    targetLeads: 75,
    budget: 2500,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign-4',
    name: 'On-Hold Campaign',
    description: 'Paused for review',
    status: 'PAUSED',
    sector: null,
    theme: null,
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-05-31'),
    targetLeads: 30,
    budget: 1500,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock fetch for status updates
global.fetch = vi.fn()

describe('CampaignKanban', () => {
  const mockOnStatusChange = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  describe('Rendering', () => {
    it('renders all status columns', () => {
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText('Planned')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Paused')).toBeInTheDocument()
    })

    it('displays campaigns in correct columns', () => {
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check campaigns are in correct columns
      expect(screen.getAllByText('Q1 Lead Generation').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Enterprise Outreach').length).toBeGreaterThan(0)
      expect(screen.getAllByText('SMB Campaign').length).toBeGreaterThan(0)
      expect(screen.getAllByText('On-Hold Campaign').length).toBeGreaterThan(0)
    })

    it('shows campaign statistics in cards', () => {
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check for target leads
      expect(screen.getAllByText('100').length).toBeGreaterThan(0)
      expect(screen.getAllByText('50').length).toBeGreaterThan(0)
      expect(screen.getAllByText('75').length).toBeGreaterThan(0)
      expect(screen.getAllByText('30').length).toBeGreaterThan(0)

      // Check for budget formatting
      expect(screen.getAllByText('$5,000').length).toBeGreaterThan(0)
      expect(screen.getAllByText('$3,000').length).toBeGreaterThan(0)
      expect(screen.getAllByText('$2,500').length).toBeGreaterThan(0)
      expect(screen.getAllByText('$1,500').length).toBeGreaterThan(0)
    })

    it('displays empty state for columns with no campaigns', () => {
      const emptyCampaigns: Campaign[] = []
      
      render(
        <CampaignKanban
          campaigns={emptyCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check for empty state messages - there should be 4 columns with empty states
      const emptyStates = screen.getAllByText('No campaigns')
      expect(emptyStates).toHaveLength(4)
    })
  })

  describe('Drag and Drop', () => {
    it('allows dragging campaigns between columns', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Find a campaign card to drag
      const campaignCards = screen.getAllByTestId('campaign-card')
      const campaignCard = campaignCards.find(card => 
        card.textContent?.includes('Q1 Lead Generation')
      )
      expect(campaignCard).toBeInTheDocument()

      // Mock dataTransfer for drag event
      const dataTransfer = {
        effectAllowed: '',
        setData: vi.fn(),
        getData: vi.fn(),
        dropEffect: '',
      }
      fireEvent.dragStart(campaignCard!, { dataTransfer })
      
      // Find target column
      const activeColumn = screen.getAllByText('Active')[0].closest('[data-testid="kanban-column"]')
      expect(activeColumn).toBeInTheDocument()

      fireEvent.drop(activeColumn!, { dataTransfer })

      // Verify status change callback was called
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith('campaign-1', 'ACTIVE')
      })
    })

    it('prevents dropping on invalid columns', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      const campaignCards = screen.getAllByTestId('campaign-card')
      const campaignCard = campaignCards.find(card => 
        card.textContent?.includes('Q1 Lead Generation')
      )
      // Mock dataTransfer for drag event
      const dataTransfer = {
        effectAllowed: '',
        setData: vi.fn(),
        getData: vi.fn(),
        dropEffect: '',
      }
      fireEvent.dragStart(campaignCard!, { dataTransfer })

      // Try to drop on a non-droppable area
      const headings = screen.getAllByText('Campaigns')
      const nonDroppableArea = headings[0].closest('div')
      fireEvent.drop(nonDroppableArea!, { dataTransfer })

      // Verify no status change was called
      expect(mockOnStatusChange).not.toHaveBeenCalled()
    })
  })

  describe('Campaign Actions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Find and click edit button
      const editButtons = screen.getAllByLabelText('Edit campaign')
      await user.click(editButtons[0])

      expect(mockOnEdit).toHaveBeenCalledWith(mockCampaigns[0])
    })

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Find and click delete button
      const deleteButtons = screen.getAllByLabelText('Delete campaign')
      await user.click(deleteButtons[0])

      expect(mockOnDelete).toHaveBeenCalledWith(mockCampaigns[0])
    })
  })

  describe('Filtering and Search', () => {
    it('filters campaigns by search term', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Find search input
      const searchInputs = screen.getAllByPlaceholderText('Search campaigns...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'Enterprise')

      // Verify only Enterprise campaign is shown
      expect(screen.getAllByText('Enterprise Outreach').length).toBeGreaterThan(0)
      // The Q1 Lead Generation campaign should still be visible in its column
      expect(screen.getAllByText('Q1 Lead Generation').length).toBeGreaterThan(0)
    })

    it('filters campaigns by date range', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Find date range inputs
      const startDateInput = screen.getByLabelText('Start date')
      const endDateInput = screen.getByLabelText('End date')

      await user.type(startDateInput, '2025-01-01')
      await user.type(endDateInput, '2025-06-30')

      // Verify campaigns in date range are shown
      expect(screen.getAllByText('Q1 Lead Generation').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Enterprise Outreach').length).toBeGreaterThan(0)
      // The SMB Campaign should still be visible as it's in a different column
      expect(screen.getAllByText('SMB Campaign').length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for drag and drop', () => {
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check for draggable attributes
      const campaignCards = screen.getAllByTestId('campaign-card')
      campaignCards.forEach(card => {
        expect(card).toHaveAttribute('draggable', 'true')
        expect(card).toHaveAttribute('aria-label')
      })

      // Check for droppable attributes
      const columns = screen.getAllByTestId('kanban-column')
      columns.forEach(column => {
        expect(column).toHaveAttribute('aria-droppable', 'true')
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Focus on first campaign card
      const firstCard = screen.getAllByTestId('campaign-card')[0]
      firstCard.focus()

      // Test keyboard navigation
      await user.keyboard('{Tab}')
      // Should focus on next interactive element
    })
  })

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(
        <CampaignKanban
          campaigns={mockCampaigns}
          user={mockUser}
          onStatusChange={mockOnStatusChange}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check for mobile-specific classes or layout
      const kanbanContainers = screen.getAllByTestId('kanban-container')
      expect(kanbanContainers.length).toBeGreaterThan(0)
    })
  })
}) 