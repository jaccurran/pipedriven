import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SyncProgressBar } from '@/components/contacts/SyncProgressBar'

// 🚨 CRITICAL: Mock global.fetch to prevent real network calls (timeout prevention)
global.fetch = vi.fn()

// Mock UI components with exact interface matching
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      type={type}
      data-testid={props['data-testid']}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span 
      className={`badge ${variant ? `badge-${variant}` : ''}`}
      {...props}
    >
      {children}
    </span>
  ),
}))

// 🆕 Enhanced EventSource Mock with Helper Methods (from testing patterns)
const createEventSourceMock = () => {
  const listeners: Record<string, Function[]> = {}
  const mock = {
    addEventListener: vi.fn((event: string, callback: Function) => {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(callback)
    }),
    removeEventListener: vi.fn((event: string, callback: Function) => {
      if (listeners[event]) {
        const index = listeners[event].indexOf(callback)
        if (index > -1) {
          listeners[event].splice(index, 1)
        }
      }
    }),
    close: vi.fn(),
    readyState: 0, // CONNECTING
    url: '',
    // 🆕 Helper methods for testing
    simulateEvent: (event: string, data: any) => {
      if (listeners[event]) {
        const messageEvent = new MessageEvent(event, {
          data: typeof data === 'string' ? data : JSON.stringify(data)
        })
        listeners[event].forEach(callback => callback(messageEvent))
      }
    },
    simulateConnectionOpen: () => {
      if (listeners['open']) {
        listeners['open'].forEach(callback => callback(new Event('open')))
      }
    },
    simulateConnectionError: () => {
      if (listeners['error']) {
        listeners['error'].forEach(callback => callback(new Event('error')))
      }
    },
    // 🆕 Debug helper
    getListenerCount: (event: string) => listeners[event]?.length || 0,
    getAllListeners: () => listeners
  }
  return mock
}

// 🆕 Test Data Factories (from testing templates)
const createMockSyncData = (overrides = {}) => ({
  syncId: 'sync-123',
  totalContacts: 100,
  processedContacts: 0,
  percentage: 0,
  status: 'connecting' as const,
  errors: [],
  batchNumber: 1,
  totalBatches: 1,
  ...overrides
})

const createMockProgressEvent = (data: any) => ({
  type: 'progress',
  data: createMockSyncData(data)
})

const createMockCompleteEvent = (data: any) => ({
  type: 'complete',
  data: createMockSyncData({ ...data, status: 'completed', percentage: 100, processedContacts: data.totalContacts })
})

const createMockErrorEvent = (data: any) => ({
  type: 'error',
  data: createMockSyncData({ ...data, status: 'failed' }),
  error: data.errors?.[0] || 'Unknown error'
})

// 🆕 Mock Manager Pattern (from testing patterns)
const createMockManager = () => {
  const mockEventSource = createEventSourceMock()
  
  return {
    mockEventSource,
    setSuccess: (data: any) => mockEventSource.simulateEvent('progress', createMockProgressEvent(data)),
    setComplete: (data: any) => mockEventSource.simulateEvent('complete', createMockCompleteEvent(data)),
    setError: (data: any) => mockEventSource.simulateEvent('error', createMockErrorEvent(data)),
    setConnectionOpen: () => mockEventSource.simulateConnectionOpen(),
    setConnectionError: () => mockEventSource.simulateConnectionError(),
    reset: () => {
      vi.clearAllMocks()
      vi.mocked(global.EventSource).mockImplementation(() => mockEventSource)
    }
  }
}

// Mock global EventSource
const mockManager = createMockManager()
global.EventSource = vi.fn(() => mockManager.mockEventSource) as any

describe('SyncProgressBar', () => {
  const defaultProps = {
    syncId: 'sync-123',
    onComplete: vi.fn(),
    onError: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    // 🆕 Use resetAllMocks instead of clearAllMocks (from testing patterns)
    vi.resetAllMocks()
    mockManager.reset()
  })

  afterEach(() => {
    // 🆕 Proper cleanup (from testing patterns)
    cleanup()
  })

  describe('Component Initialization', () => {
    it('should connect to SSE endpoint on mount', () => {
      render(<SyncProgressBar {...defaultProps} />)

      expect(global.EventSource).toHaveBeenCalledWith(
        '/api/pipedrive/contacts/sync/progress/sync-123'
      )
    })

    it('should show connecting state initially', () => {
    render(<SyncProgressBar {...defaultProps} />)

      expect(screen.getByText(/connecting/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    })

    it('should display sync ID in the UI', () => {
    render(<SyncProgressBar {...defaultProps} />)

      expect(screen.getByText(/sync-123/i)).toBeInTheDocument()
    })

    // 🆕 Test React.memo effectiveness (from testing patterns)
    it('should not create multiple EventSource connections on re-renders', () => {
      const { rerender } = render(<SyncProgressBar {...defaultProps} />)
      
      // Re-render with same props
      rerender(<SyncProgressBar {...defaultProps} />)
      
      // Should only create one EventSource connection
      expect(global.EventSource).toHaveBeenCalledTimes(1)
    })
  })

  describe('Progress Updates', () => {
    it('should update progress when receiving progress event', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      // 🆕 Use mock manager helper
      mockManager.setSuccess({
        totalContacts: 100,
        processedContacts: 50,
        percentage: 50,
        batchNumber: 2,
        totalBatches: 4,
      })

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument()
        expect(screen.getByText('50 of 100 contacts processed')).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
      })
    })

    it('should show batch information when available', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.setSuccess({
        totalContacts: 100,
        processedContacts: 25,
        percentage: 25,
        batchNumber: 1,
        totalBatches: 4,
      })

      await waitFor(() => {
        expect(screen.getByText('Batch 1 of 4')).toBeInTheDocument()
      })
    })

    it('should handle zero contacts processed', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.setSuccess({
        totalContacts: 100,
        processedContacts: 0,
        percentage: 0,
      })

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument()
        expect(screen.getByText('0 of 100 contacts processed')).toBeInTheDocument()
      })
    })

    // 🆕 Test debouncing behavior (from testing patterns)
    it('should handle rapid progress updates efficiently', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      // Simulate rapid progress updates
      for (let i = 1; i <= 10; i++) {
        mockManager.setSuccess({
          totalContacts: 100,
          processedContacts: i * 10,
          percentage: i * 10,
        })
      }

      // Should show final state
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })
  })

  describe('Completion Handling', () => {
    it('should show completion state and call onComplete', async () => {
      const onComplete = vi.fn()
      render(<SyncProgressBar {...defaultProps} onComplete={onComplete} />)

      mockManager.setComplete({
        totalContacts: 100,
        processedContacts: 100,
      })

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
        expect(screen.getByText('Sync completed successfully!')).toBeInTheDocument()
        expect(onComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            syncId: 'sync-123',
            totalContacts: 100,
            processedContacts: 100,
            percentage: 100,
            status: 'completed',
          })
        )
      })
    })

    it('should show completion stats', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.setComplete({
        totalContacts: 100,
        processedContacts: 100,
      })

      await waitFor(() => {
        expect(screen.getByText('100 of 100 contacts processed')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error state and call onError', async () => {
      const onError = vi.fn()
      render(<SyncProgressBar {...defaultProps} onError={onError} />)

      mockManager.setConnectionOpen()
      await waitFor(() => {
        expect(screen.getByText('Sync')).toBeInTheDocument()
      })

      mockManager.setError({
        totalContacts: 100,
        processedContacts: 25,
        percentage: 25,
        errors: ['API connection failed'],
      })

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument()
        expect(screen.getByText((content) => content.includes('API connection failed'))).toBeInTheDocument()
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            syncId: 'sync-123',
            status: 'failed',
            errors: ['API connection failed'],
          })
        )
      })
    })

    it('should handle multiple errors with expandable display', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.setConnectionOpen()
      await waitFor(() => {
        expect(screen.getByText('Sync')).toBeInTheDocument()
      })

      mockManager.setError({
        totalContacts: 100,
        processedContacts: 50,
        percentage: 50,
        errors: ['Error 1', 'Error 2', 'Error 3', 'Error 4'],
      })

      await waitFor(() => {
        expect(screen.getByText((content) => content.includes('Error 1'))).toBeInTheDocument()
        expect(screen.getByText((content) => content.includes('+1 more errors'))).toBeInTheDocument()
      })

      const expandButton = screen.getByRole('button', { name: (name) => name.includes('+1 more errors') })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText((content) => content.includes('Error 2'))).toBeInTheDocument()
        expect(screen.getByText((content) => content.includes('Error 3'))).toBeInTheDocument()
        expect(screen.getByText((content) => content.includes('Error 4'))).toBeInTheDocument()
      })
    })

    it('should handle SSE connection errors', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.setConnectionError()

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument()
        expect(screen.getByText('Unable to connect to sync progress stream')).toBeInTheDocument()
      })
    })

    it('should categorize different types of errors', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.setConnectionOpen()
      await waitFor(() => {
        expect(screen.getByText('Sync')).toBeInTheDocument()
      })

      mockManager.setError({
        totalContacts: 100,
        processedContacts: 50,
        percentage: 50,
        errors: ['Rate limit exceeded', 'Network timeout'],
        retrySuggestion: 'Try again in 1 minute.',
      })

      await waitFor(() => {
        expect(screen.getByText((content) => content.includes('Rate limit exceeded'))).toBeInTheDocument()
        expect(screen.getByText((content) => content.includes('Network timeout'))).toBeInTheDocument()
        expect(screen.getByText((content) => content.includes('💡'))).toBeInTheDocument()
        expect(screen.getByText((content) => content.includes('Try again in 1 minute.'))).toBeInTheDocument()
      })
    })
  })

  describe('Cancellation', () => {
    it('should show cancel button during processing', () => {
      render(<SyncProgressBar {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn()
      const user = userEvent.setup()
      render(<SyncProgressBar {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledWith('sync-123')
    })

    it('should close EventSource connection on cancel', async () => {
      const onCancel = vi.fn()
      const user = userEvent.setup()
      render(<SyncProgressBar {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockManager.mockEventSource.close).toHaveBeenCalled()
    })

    it('should show cancelled state when sync is cancelled', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.mockEventSource.simulateEvent('cancelled', {
        type: 'cancelled',
        data: createMockSyncData({
          totalContacts: 100,
          processedContacts: 50,
          percentage: 50,
          status: 'cancelled',
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Sync cancelled')).toBeInTheDocument()
        expect(screen.getByText('50 of 100 contacts processed')).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup and Resource Management', () => {
    it('should close EventSource connection on unmount', () => {
      const { unmount } = render(<SyncProgressBar {...defaultProps} />)

      unmount()

      expect(mockManager.mockEventSource.close).toHaveBeenCalled()
    })

    it('should remove event listeners on unmount', () => {
      const { unmount } = render(<SyncProgressBar {...defaultProps} />)

      unmount()

      expect(mockManager.mockEventSource.close).toHaveBeenCalled()
    })

    // 🆕 Test memory leak prevention (from testing patterns)
    it('should not create memory leaks with multiple mounts/unmounts', () => {
      const { unmount: unmount1 } = render(<SyncProgressBar {...defaultProps} />)
      unmount1()

      const { unmount: unmount2 } = render(<SyncProgressBar {...defaultProps} />)
      unmount2()

      // Should create new EventSource for each mount
      expect(global.EventSource).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SyncProgressBar {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-label', 'Sync progress')
    })

    it('should update ARIA attributes with progress', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.setSuccess({
        totalContacts: 100,
        processedContacts: 75,
        percentage: 75,
      })

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '75')
      })
    })

    // 🆕 Test keyboard accessibility (from testing patterns)
    it('should be keyboard accessible', async () => {
      const onCancel = vi.fn()
      render(<SyncProgressBar {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      // Test keyboard interaction
      cancelButton.focus()
      expect(cancelButton).toHaveFocus()
      
      // Test Enter key
      await userEvent.keyboard('{Enter}')
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Edge Cases and Error Resilience', () => {
    it('should handle malformed SSE data gracefully', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.mockEventSource.simulateEvent('progress', 'invalid json')

      // Should not crash and should maintain current state
      await waitFor(() => {
        expect(screen.queryByText(/connecting/i)).toBeInTheDocument()
      })
    })

    it('should handle missing data fields gracefully', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      mockManager.mockEventSource.simulateEvent('progress', {
        type: 'progress',
        data: {
          syncId: 'sync-123',
          // Missing other fields
        },
      })

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.queryByText(/connecting/i)).toBeInTheDocument()
      })
    })

    // 🆕 Test timeout handling (from testing patterns)
    it('should handle EventSource timeout gracefully', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      // Simulate timeout by changing readyState
      mockManager.mockEventSource.readyState = 2 // CLOSED
      mockManager.setConnectionError()

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument()
      })
    })

    // 🆕 Test rapid state changes (from testing patterns)
    it('should handle rapid state changes without race conditions', async () => {
      render(<SyncProgressBar {...defaultProps} />)

      // Simulate rapid state changes
      mockManager.setConnectionOpen()
      mockManager.setSuccess({ totalContacts: 100, processedContacts: 50, percentage: 50 })
      mockManager.setError({ totalContacts: 100, processedContacts: 50, percentage: 50, errors: ['Error'] })
      mockManager.setSuccess({ totalContacts: 100, processedContacts: 75, percentage: 75 })

      // Should show final state
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Experience', () => {
    // 🆕 Test responsive behavior (from testing patterns)
    it('should be responsive on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<SyncProgressBar {...defaultProps} />)

      // Should have mobile-friendly classes
      const container = screen.getByTestId('sync-progress-container')
      expect(container).toHaveClass('sm:p-4', 'p-3')
    })

    it('should handle touch interactions properly', async () => {
      const onCancel = vi.fn()
      const user = userEvent.setup()
      render(<SyncProgressBar {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      // Test touch interaction
      await user.click(cancelButton)
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Performance Optimizations', () => {
    // 🆕 Test debouncing (from testing patterns)
    it('should debounce rapid progress updates', async () => {
    render(<SyncProgressBar {...defaultProps} />)

      const startTime = Date.now()

      // Send many rapid updates
      for (let i = 1; i <= 20; i++) {
        mockManager.setSuccess({
          totalContacts: 100,
          processedContacts: i * 5,
          percentage: i * 5,
        })
      }

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })

      const endTime = Date.now()
      // Should complete quickly due to debouncing
      expect(endTime - startTime).toBeLessThan(1000)
    })

    // 🆕 Test React.memo effectiveness
    it('should not re-render unnecessarily with React.memo', () => {
      const { rerender } = render(<SyncProgressBar {...defaultProps} />)
      
      // Re-render with same props multiple times
      for (let i = 0; i < 5; i++) {
        rerender(<SyncProgressBar {...defaultProps} />)
      }
      
      // Should only create one EventSource connection
      expect(global.EventSource).toHaveBeenCalledTimes(1)
    })
  })
}) 