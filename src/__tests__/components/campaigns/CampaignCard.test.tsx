import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
import { Campaign, User } from '@prisma/client'

// Mock the action components
vi.mock('@/components/actions/QuickActionButton', () => ({
  QuickActionButton: ({ type, onClick, contactName, className }: any) => (
    <button
      onClick={() => onClick(type)}
      aria-label={`Log ${type.toLowerCase()} for ${contactName}`}
      className={className}
      data-testid={`quick-action-${type.toLowerCase()}`}
    >
      {type}
    </button>
  ),
}))

vi.mock('@/components/actions/ActionMenu', () => ({
  ActionMenu: ({ onAction, contactName }: any) => (
    <div data-testid="action-menu">
      <button
        onClick={() => onAction('LINKEDIN')}
        data-testid="linkedin-action"
        aria-label="LinkedIn action"
      >
        LinkedIn
      </button>
      <button
        onClick={() => onAction('PHONE_CALL')}
        data-testid="phone-call-action"
        aria-label="Phone call action"
      >
        Phone Call
      </button>
      <button
        onClick={() => onAction('CONFERENCE')}
        data-testid="conference-action"
        aria-label="Conference action"
      >
        Conference
      </button>
    </div>
  ),
}))

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

const mockCampaign: Campaign = {
  id: 'campaign-1',
  name: 'Q1 Lead Generation',
  description: 'Generate leads for Q1 sales',
  status: 'PLANNED',
  sector: 'Technology',
  theme: 'Digital Transformation',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-03-31'),
  targetLeads: 100,
  budget: 5000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CampaignCard', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnDragStart = vi.fn()
  const mockOnDragEnd = vi.fn()
  const mockOnActivity = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders campaign information correctly', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      expect(screen.getByTestId('campaign-card')).toBeInTheDocument()
      expect(screen.getByText('Generate leads for Q1 sales')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Jan 1 - Mar 31')).toBeInTheDocument()
    })

    it('renders without description when not provided', () => {
      const campaignWithoutDescription = {
        ...mockCampaign,
        description: null,
      }

      render(
        <CampaignCard
          campaign={campaignWithoutDescription}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      expect(screen.getByText('Q1 Lead Generation')).toBeInTheDocument()
      expect(screen.queryByText('Generate leads for Q1 sales')).not.toBeInTheDocument()
    })

    it('applies dragging styles when isDragging is true', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={true}
        />
      )

      const card = screen.getByTestId('campaign-card')
      expect(card).toHaveClass('opacity-50', 'scale-95', 'shadow-lg')
    })
  })

  describe('Action System Integration', () => {
    it('shows action system when onActivity is provided', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          onActivity={mockOnActivity}
          isDragging={false}
        />
      )

      // Check for primary action buttons
      expect(screen.getByTestId('quick-action-email')).toBeInTheDocument()
      expect(screen.getByTestId('quick-action-meeting_request')).toBeInTheDocument()
      expect(screen.getByTestId('quick-action-meeting')).toBeInTheDocument()

      // Check for secondary action menu
      expect(screen.getByTestId('action-menu')).toBeInTheDocument()
    })

    it('calls onActivity with correct parameters when primary actions are clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          onActivity={mockOnActivity}
          isDragging={false}
        />
      )

      // Test Email action
      await user.click(screen.getByTestId('quick-action-email'))
      expect(mockOnActivity).toHaveBeenCalledWith('campaign-1', 'EMAIL')

      // Test Meeting Request action
      await user.click(screen.getByTestId('quick-action-meeting_request'))
      expect(mockOnActivity).toHaveBeenCalledWith('campaign-1', 'MEETING_REQUEST')

      // Test Meeting action
      await user.click(screen.getByTestId('quick-action-meeting'))
      expect(mockOnActivity).toHaveBeenCalledWith('campaign-1', 'MEETING')
    })

    it('calls onActivity with correct parameters when secondary actions are clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          onActivity={mockOnActivity}
          isDragging={false}
        />
      )

      // Test LinkedIn action
      await user.click(screen.getByTestId('linkedin-action'))
      expect(mockOnActivity).toHaveBeenCalledWith('campaign-1', 'LINKEDIN')

      // Test Phone Call action
      await user.click(screen.getByTestId('phone-call-action'))
      expect(mockOnActivity).toHaveBeenCalledWith('campaign-1', 'PHONE_CALL')

      // Test Conference action
      await user.click(screen.getByTestId('conference-action'))
      expect(mockOnActivity).toHaveBeenCalledWith('campaign-1', 'CONFERENCE')
    })

    it('does not show action system when onActivity is not provided', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      expect(screen.queryByTestId('quick-action-email')).not.toBeInTheDocument()
      expect(screen.queryByTestId('quick-action-meeting_request')).not.toBeInTheDocument()
      expect(screen.queryByTestId('quick-action-meeting')).not.toBeInTheDocument()
      expect(screen.queryByTestId('action-menu')).not.toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('calls onDragStart when drag starts', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      const card = screen.getByTestId('campaign-card')
      fireEvent.dragStart(card)

      expect(mockOnDragStart).toHaveBeenCalledWith(expect.any(Object), 'campaign-1')
    })

    it('calls onDragEnd when drag ends', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      const card = screen.getByTestId('campaign-card')
      fireEvent.dragEnd(card)

      expect(mockOnDragEnd).toHaveBeenCalled()
    })

    it('has proper draggable attributes', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      const card = screen.getByTestId('campaign-card')
      expect(card).toHaveAttribute('draggable', 'true')
      expect(card).toHaveAttribute('aria-label', 'Campaign: Q1 Lead Generation. Drag to move between columns.')
    })
  })

  describe('Actions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      const editButton = screen.getByLabelText('Edit campaign')
      await user.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(mockCampaign)
    })

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      const deleteButton = screen.getByLabelText('Delete campaign')
      await user.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledWith(mockCampaign)
    })

    it('does not render action buttons when callbacks are not provided', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      expect(screen.queryByLabelText('Edit campaign')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Delete campaign')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      const card = screen.getByTestId('campaign-card')
      card.focus()

      // Test Enter key
      await user.keyboard('{Enter}')
      // Should handle card selection/focus

      // Test Tab navigation
      await user.keyboard('{Tab}')
      // Should focus on next interactive element
    })

    it('has proper focus styles', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      const card = screen.getByTestId('campaign-card')
      expect(card).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-2')
    })

    it('has proper ARIA labels for action system', () => {
      render(
        <CampaignCard
          campaign={mockCampaign}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          onActivity={mockOnActivity}
          isDragging={false}
        />
      )

      expect(screen.getByLabelText('Log email for Q1 Lead Generation')).toBeInTheDocument()
      expect(screen.getByLabelText('Log meeting_request for Q1 Lead Generation')).toBeInTheDocument()
      expect(screen.getByLabelText('Log meeting for Q1 Lead Generation')).toBeInTheDocument()
    })
  })

  describe('Data Formatting', () => {
    it('formats dates correctly', () => {
      const campaignWithDifferentDates = {
        ...mockCampaign,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-31'),
      }

      render(
        <CampaignCard
          campaign={campaignWithDifferentDates}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      expect(screen.getByText('Dec 1 - Dec 31')).toBeInTheDocument()
    })
  })
}) 