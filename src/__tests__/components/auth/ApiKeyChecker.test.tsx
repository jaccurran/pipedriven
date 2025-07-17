import { render, screen, waitFor, waitForElementToBeRemoved, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { SessionProvider } from 'next-auth/react'
import { ApiKeyChecker } from '@/components/auth/ApiKeyChecker'
import { ApiKeySetupDialog } from '@/components/auth/ApiKeySetupDialog'

// Mock the ApiKeySetupDialog component
vi.mock('@/components/auth/ApiKeySetupDialog', () => ({
  ApiKeySetupDialog: vi.fn(({ isOpen, onSuccess, onCancel }) => {
    if (!isOpen) return null
    return (
      <div data-testid="api-key-setup-dialog">
        <button onClick={onSuccess} data-testid="dialog-success">Success</button>
        <button onClick={onCancel} data-testid="dialog-cancel">Cancel</button>
      </div>
    )
  })
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock next-auth
const mockUseSession = vi.fn()

vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react')
  return {
    ...actual,
    useSession: () => mockUseSession(),
  }
})

describe('ApiKeyChecker', () => {
  const defaultProps = {
    children: <div data-testid="children">Dashboard Content</div>,
    onApiKeyValid: vi.fn(),
    onApiKeyInvalid: vi.fn(),
    showDialog: true,
  }

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      pipedriveApiKey: 'encrypted-api-key',
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  const renderWithSession = (props = {}) => {
    return render(
      <SessionProvider>
        <ApiKeyChecker {...defaultProps} {...props} />
      </SessionProvider>
    )
  }

  describe('Loading State', () => {
    it('should show loading state while checking API key', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      renderWithSession()

      expect(screen.getAllByText('Checking API key...')[0]).toBeInTheDocument()
      expect(screen.getAllByRole('status')[0]).toBeInTheDocument()
    })

    it('should show loading spinner with proper styling', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      renderWithSession()

      const spinner = screen.getAllByRole('status')[0]
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-blue-600')
    })
  })

  describe('No Session', () => {
    it('should render children when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      renderWithSession()

      expect(screen.getAllByTestId('children')[0]).toBeInTheDocument()
      expect(screen.queryAllByTestId('api-key-setup-dialog')).toHaveLength(0)
    })
  })

  describe('API Key Validation', () => {
    it('should validate API key on mount', async () => {
      renderWithSession()

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/pipedrive/test-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      })
    })

    it('should call onApiKeyValid when API key is valid', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(defaultProps.onApiKeyValid).toHaveBeenCalled()
      })
    })

    it('should call onApiKeyInvalid when API key is invalid', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Invalid API key' }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(defaultProps.onApiKeyInvalid).toHaveBeenCalled()
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      renderWithSession()

      await waitFor(() => {
        expect(defaultProps.onApiKeyInvalid).toHaveBeenCalled()
      })
    })
  })

  describe('No API Key', () => {
    it('should show setup dialog when user has no API key', async () => {
      mockUseSession.mockReturnValue({
        data: {
          ...mockSession,
          user: {
            ...mockSession.user,
            pipedriveApiKey: null,
          },
        },
        status: 'authenticated',
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getAllByTestId('api-key-setup-dialog')[0]).toBeInTheDocument()
      })
    })

    it('should call onApiKeyInvalid when no API key', async () => {
      mockUseSession.mockReturnValue({
        data: {
          ...mockSession,
          user: {
            ...mockSession.user,
            pipedriveApiKey: null,
          },
        },
        status: 'authenticated',
      })

      renderWithSession()

      await waitFor(() => {
        expect(defaultProps.onApiKeyInvalid).toHaveBeenCalled()
      })
    })
  })

  describe('Dialog Management', () => {
    it('should show setup dialog when API key validation fails', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Invalid API key' }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getAllByTestId('api-key-setup-dialog')[0]).toBeInTheDocument()
      })
    })

    it('should not show dialog when showDialog is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Invalid API key' }),
      })

      renderWithSession({ showDialog: false })

      expect(screen.queryAllByTestId('api-key-setup-dialog')).toHaveLength(0)
    })

    it('should render children when showDialog is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Invalid API key' }),
      })

      renderWithSession({ showDialog: false })

      await waitFor(() => {
        expect(screen.getAllByTestId('children')[0]).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Callbacks', () => {
    it('should handle successful API key setup', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Invalid API key' }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getAllByTestId('api-key-setup-dialog')[0]).toBeInTheDocument()
      })

      const successButton = screen.getAllByTestId('dialog-success')[0]
      await userEvent.click(successButton)

      expect(defaultProps.onApiKeyValid).toHaveBeenCalled()
    })

    it('should handle dialog cancellation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Invalid API key' }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getAllByTestId('api-key-setup-dialog')[0]).toBeInTheDocument()
      })

      const cancelButton = screen.getAllByTestId('dialog-cancel')[0]
      await userEvent.click(cancelButton)

      // Dialog should be hidden but children should still render
      expect(screen.getAllByTestId('children')[0]).toBeInTheDocument()
    })
  })

  describe('Valid API Key', () => {
    it('should render children when API key is valid', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getAllByTestId('children')[0]).toBeInTheDocument()
      })

      expect(screen.queryAllByTestId('api-key-setup-dialog')).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(defaultProps.onApiKeyInvalid).toHaveBeenCalled()
      })
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      renderWithSession()

      await waitFor(() => {
        expect(defaultProps.onApiKeyInvalid).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper loading state accessibility', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      renderWithSession()

      const loadingText = screen.getAllByText('Checking API key...')[0]
      expect(loadingText).toBeInTheDocument()
    })

    it('should render children with proper structure', async () => {
      mockUseSession.mockReturnValue({
        data: {
          ...mockSession,
          user: {
            ...mockSession.user,
            pipedriveApiKey: 'encrypted-api-key',
          },
        },
        status: 'authenticated',
      })
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getAllByTestId('children')[0]).toBeInTheDocument()
      })
    })
  })
}) 