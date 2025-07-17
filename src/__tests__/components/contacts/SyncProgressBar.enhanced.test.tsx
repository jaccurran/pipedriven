import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cleanup } from '@testing-library/react'
import { SyncProgressBar } from '@/components/contacts/SyncProgressBar'

// Mock EventSource
const mockEventSource = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: 0, // CONNECTING
  url: '',
}

// Mock global EventSource
global.EventSource = vi.fn(() => mockEventSource) as any

describe('SyncProgressBar Enhanced Features', () => {
  const defaultProps = {
    syncId: 'sync-123',
    onComplete: vi.fn(),
    onError: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(global.EventSource).mockImplementation(() => mockEventSource)
  })

  afterEach(() => {
    if (mockEventSource.close) {
      mockEventSource.close()
    }
    cleanup()
  })

  describe('Visual Enhancements', () => {
    it('should show animated progress bar with smooth transitions', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      // Simulate progress update
      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveClass('transition-all', 'duration-300')
      })
    })

    it('should display pulsing indicator during processing', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 25,
            percentage: 25,
            status: 'processing',
            errors: [],
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        const processingIndicator = screen.getByTestId('processing-indicator')
        expect(processingIndicator).toHaveClass('animate-pulse')
      })
    })

    it('should show status icons for different states', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      // Test processing state
      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        const spinnerIcon = screen.getByTestId('spinner-icon')
        expect(spinnerIcon).toBeInTheDocument()
      })
    })

    it('should show checkmark icon on completion', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const completeEvent = new MessageEvent('complete', {
        data: JSON.stringify({
          type: 'complete',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 100,
            percentage: 100,
            status: 'completed',
            errors: [],
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'complete'
      )?.[1]
      eventListener?.(completeEvent)

      await waitFor(() => {
        const checkmarkIcon = screen.getByTestId('checkmark-icon')
        expect(checkmarkIcon).toBeInTheDocument()
      })
    })
  })

  describe('Additional Progress Information', () => {
    it('should display estimated time remaining', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      // Simulate progress with timing data
      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
            startTime: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
            estimatedTimeRemaining: 30000, // 30 seconds remaining
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        expect(screen.getByText(/~30s remaining/)).toBeInTheDocument()
      })
    })

    it('should display processing speed', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
            processingSpeed: 1.67, // contacts per second
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        expect(screen.getByText(/1.7 contacts\/sec/)).toBeInTheDocument()
      })
    })

    it('should show sync type indicator', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
            syncType: 'INCREMENTAL',
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        expect(screen.getByText('Incremental Sync')).toBeInTheDocument()
      })
    })

    it('should show rate limiting indicator when active', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
            rateLimited: true,
            rateLimitDelay: 1000,
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        expect(screen.getByText(/Rate limited/)).toBeInTheDocument()
        expect(screen.getByText(/1s delay/)).toBeInTheDocument()
      })
    })
  })

  describe('Enhanced Error Display', () => {
    it('should show expandable error details', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const errorEvent = new MessageEvent('error', {
        data: JSON.stringify({
          type: 'error',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 25,
            percentage: 25,
            status: 'failed',
            errors: [
              'Contact "John Doe" (ID: 123): Invalid email format',
              'Contact "Jane Smith" (ID: 456): Organization not found',
              'Contact "Bob Wilson" (ID: 789): API rate limit exceeded',
            ],
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      eventListener?.(errorEvent)

      await waitFor(() => {
        expect(screen.getByText('Errors (3)')).toBeInTheDocument()
        expect(screen.getByText(/\+2 more errors/)).toBeInTheDocument()
      })

      // Click to expand
      const expandButton = screen.getByText(/\+2 more errors/)
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText(/Organization not found/)).toBeInTheDocument()
        expect(screen.getByText(/API rate limit exceeded/)).toBeInTheDocument()
      })
    })

    it('should categorize errors by type', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const errorEvent = new MessageEvent('error', {
        data: JSON.stringify({
          type: 'error',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 25,
            percentage: 25,
            status: 'failed',
            errors: [
              'Contact "John Doe" (ID: 123): Invalid email format',
              'Contact "Jane Smith" (ID: 456): Organization not found',
            ],
            errorCategories: {
              validation: 1,
              api: 1,
            },
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      eventListener?.(errorEvent)

      await waitFor(() => {
        expect(screen.getByText('Validation Errors: 1')).toBeInTheDocument()
        expect(screen.getByText('API Errors: 1')).toBeInTheDocument()
      })
    })

    it('should show retry suggestions for common errors', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const errorEvent = new MessageEvent('error', {
        data: JSON.stringify({
          type: 'error',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 25,
            percentage: 25,
            status: 'failed',
            errors: ['API rate limit exceeded'],
            retrySuggestion: 'Try again in 1 minute or reduce batch size',
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      eventListener?.(errorEvent)

      await waitFor(() => {
        expect(screen.getByText(/Try again in 1 minute/)).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Experience', () => {
    it('should have responsive design for small screens', async () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<SyncProgressBar {...defaultProps} />)

      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        const container = screen.getByTestId('sync-progress-container')
        expect(container).toHaveClass('sm:p-4', 'p-3') // Responsive padding
      })
    })

    it('should have touch-friendly cancel button', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toHaveClass('min-h-[44px]') // Touch-friendly height
    })

    it('should show compact mode on very small screens', async () => {
      // Mock window.innerWidth for very small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })

      render(<SyncProgressBar {...defaultProps} />)

      const progressEvent = new MessageEvent('progress', {
        data: JSON.stringify({
          type: 'progress',
          data: {
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 50,
            percentage: 50,
            status: 'processing',
            errors: [],
          },
        }),
      })

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]
      eventListener?.(progressEvent)

      await waitFor(() => {
        const container = screen.getByTestId('sync-progress-container')
        expect(container).toHaveClass('compact-mode')
      })
    })
  })

  describe('Performance Optimizations', () => {
    it('should debounce progress updates to prevent excessive re-renders', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      const eventListener = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]

      // Send multiple rapid updates
      for (let i = 1; i <= 10; i++) {
        const progressEvent = new MessageEvent('progress', {
          data: JSON.stringify({
            type: 'progress',
            data: {
              syncId: 'sync-123',
              totalContacts: 100,
              processedContacts: i * 10,
              percentage: i * 10,
              status: 'processing',
              errors: [],
            },
          }),
        })
        eventListener?.(progressEvent)
      }

      // Should only show the last update
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })

    it('should use React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(<SyncProgressBar {...defaultProps} />)
      
      // Re-render with same props
      rerender(<SyncProgressBar {...defaultProps} />)
      
      // Should not cause unnecessary updates
      expect(mockEventSource.addEventListener).toHaveBeenCalledTimes(1)
    })
  })
}) 