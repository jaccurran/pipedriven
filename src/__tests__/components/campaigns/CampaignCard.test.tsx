import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
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

  beforeEach(() => {
    vi.clearAllMocks()
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

      expect(screen.getByText('Q1 Lead Generation')).toBeInTheDocument()
      expect(screen.getByText('Generate leads for Q1 sales')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('$5,000')).toBeInTheDocument()
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
  })

  describe('Data Formatting', () => {
    it('formats currency correctly', () => {
      const campaignWithLargeBudget = {
        ...mockCampaign,
        budget: 15000,
      }

      render(
        <CampaignCard
          campaign={campaignWithLargeBudget}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onDragStart={mockOnDragStart}
          onDragEnd={mockOnDragEnd}
          isDragging={false}
        />
      )

      expect(screen.getByText('$15,000')).toBeInTheDocument()
    })

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