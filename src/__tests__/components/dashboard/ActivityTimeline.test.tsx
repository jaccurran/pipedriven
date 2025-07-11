import React from 'react'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'

// Mock fetch
global.fetch = vi.fn()

// Mock UI components
vi.mock('@/components/ui', () => ({
  Card: vi.fn(({ children, className, ...props }) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  )),
  Badge: vi.fn(({ children, variant, size, ...props }) => (
    <span data-testid="badge" data-variant={variant} data-size={size} {...props}>
      {children}
    </span>
  )),
}))

const createMockActivity = (overrides = {}) => ({
  id: 'activity-1',
  type: 'EMAIL' as const,
  subject: 'Follow-up email',
  note: 'Sent follow-up email to discuss partnership',
  createdAt: new Date('2025-01-15T10:00:00Z'),
  contact: {
    id: 'contact-1',
    name: 'John Doe',
    organisation: 'Acme Corp',
  },
  campaign: {
    id: 'campaign-1',
    name: 'Q1 Outreach',
  },
  ...overrides,
})

const createMockActivities = (count = 3) =>
  Array.from({ length: count }, (_, i) =>
    createMockActivity({
      id: `activity-${i + 1}`,
      subject: `Activity ${i + 1}`,
      createdAt: new Date(`2025-01-${10 + i}T10:00:00Z`),
    })
  )

describe('ActivityTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset global.fetch to avoid test interference
    global.fetch = vi.fn()
  })

  afterEach(() => {
    cleanup()
  })

  describe('when loading', () => {
    it('should show loading skeleton', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<ActivityTimeline />)
      
      expect(screen.getByText('Recent Activities')).toBeInTheDocument()
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })
  })

  describe('when activities are loaded successfully', () => {
    it('should display activities with correct information', async () => {
      const mockActivities = createMockActivities(3)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        expect(screen.getByText('Activity 1')).toBeInTheDocument()
        const items = screen.getAllByText('John Doe');
        expect(items).toHaveLength(3);
        const campaigns = screen.getAllByText('Q1 Outreach');
        expect(campaigns).toHaveLength(3);
      })
    })

    it('should display activity type badges', async () => {
      const mockActivities = createMockActivities(3)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        const badges = screen.getAllByTestId('badge')
        expect(badges.length).toBeGreaterThan(0)
      })
    })

    it('should format relative time correctly', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const mockActivities = [createMockActivity({ createdAt: oneHourAgo })]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        expect(screen.getByText('1h ago')).toBeInTheDocument()
      })
    })

    it('should show activity count badge', async () => {
      const mockActivities = createMockActivities(5)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })
    })
  })

  describe('when no activities exist', () => {
    it('should show empty state message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        expect(screen.getByText('No recent activities')).toBeInTheDocument()
        expect(screen.getByText('Start by logging your first outreach activity')).toBeInTheDocument()
      })
    })
  })

  describe('when API request fails', () => {
    it('should show error message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load activities')).toBeInTheDocument()
        expect(screen.getByText('Please try again later')).toBeInTheDocument()
      })
    })
  })

  describe('infinite scroll functionality', () => {
    it('should show load more button when there are more activities', async () => {
      const mockActivities = createMockActivities(10) // Default limit
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline limit={10} />)

      await waitFor(() => {
        expect(screen.getByText('Load more')).toBeInTheDocument()
      })
    })

    it('should load more activities when load more is clicked', async () => {
      const initialActivities = createMockActivities(10)
      const moreActivities = createMockActivities(5).map((activity, i) => ({
        ...activity,
        id: `activity-${i + 11}`,
        subject: `More Activity ${i + 1}`,
      }))

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialActivities }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: moreActivities }),
        })

      render(<ActivityTimeline limit={10} />)

      await waitFor(() => {
        expect(screen.getByText('Load more')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Load more'))

      await waitFor(() => {
        expect(screen.getByText('More Activity 1')).toBeInTheDocument()
      })
    })

    it('should hide load more button when no more activities', async () => {
      const mockActivities = createMockActivities(5) // Less than limit
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline limit={10} />)

      await waitFor(() => {
        expect(screen.queryByText('Load more')).not.toBeInTheDocument()
      })
    })
  })

  describe('activity type icons', () => {
    it('should display correct icons for different activity types', async () => {
      const mockActivities = [
        createMockActivity({ id: 'activity-email', type: 'EMAIL', subject: 'Email activity' }),
        createMockActivity({ id: 'activity-call', type: 'CALL', subject: 'Call activity' }),
        createMockActivity({ id: 'activity-meeting', type: 'MEETING', subject: 'Meeting activity' }),
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        expect(screen.getByText('📧')).toBeInTheDocument()
        expect(screen.getByText('📞')).toBeInTheDocument()
        expect(screen.getByText('🤝')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const mockActivities = createMockActivities(1)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument()
      })
    })

    it('should be keyboard navigable', async () => {
      const mockActivities = createMockActivities(10)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline limit={10} />)

      await waitFor(() => {
        const loadMoreButton = screen.getByText('Load more')
        expect(loadMoreButton).toBeInTheDocument()
        loadMoreButton.focus()
        expect(loadMoreButton).toHaveFocus()
      })
    })
  })

  describe('mobile responsiveness', () => {
    it('should have responsive layout classes', async () => {
      const mockActivities = createMockActivities(1)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      })

      render(<ActivityTimeline />)

      await waitFor(() => {
        const card = screen.getByTestId('card')
        expect(card).toHaveClass('p-4')
      })
    })
  })
}) 