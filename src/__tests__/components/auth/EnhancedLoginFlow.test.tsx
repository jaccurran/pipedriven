import { render, screen, waitFor } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { SessionProvider } from 'next-auth/react'
import { EnhancedLoginFlow, withApiKeyValidation, useApiKeyStatus } from '@/components/auth/EnhancedLoginFlow'
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

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('EnhancedLoginFlow', () => {
  const defaultProps = {
    children: <div data-testid="children">Protected Content</div>,
    redirectTo: '/dashboard',
    requireApiKey: true,
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
  })

  const renderWithSession = (props = {}) => {
    return render(
      <SessionProvider>
        <EnhancedLoginFlow {...defaultProps} {...props} />
      </SessionProvider>
    )
  }

  describe('Loading State', () => {
    it('should show loading state while checking authentication', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      renderWithSession()

      expect(screen.getByText('Setting up your account...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should show loading spinner with proper styling', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      renderWithSession()

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-blue-600')
    })
  })

  describe('Authentication', () => {
    it('should redirect to signin when not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      renderWithSession()

      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })

    it('should render children when authenticated and API key not required', () => {
      renderWithSession({ requireApiKey: false })

      expect(screen.getByTestId('children')).toBeInTheDocument()
      expect(screen.queryByTestId('api-key-setup-dialog')).not.toBeInTheDocument()
    })
  })

  describe('API Key Validation', () => {
    it('should validate API key when authenticated and API key required', async () => {
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

    it('should render children when API key is valid', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getByTestId('children')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('api-key-setup-dialog')).not.toBeInTheDocument()
    })

    it('should show setup dialog when API key is invalid', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getByTestId('api-key-setup-dialog')).toBeInTheDocument()
      })
    })

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
        expect(screen.getByTestId('api-key-setup-dialog')).toBeInTheDocument()
      })
    })

    it('should handle API key validation errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      renderWithSession()

      await waitFor(() => {
        expect(screen.getByTestId('api-key-setup-dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Callbacks', () => {
    it('should handle successful API key setup', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getByTestId('api-key-setup-dialog')).toBeInTheDocument()
      })

      const successButton = screen.getByTestId('dialog-success')
      await successButton.click()

      // Should render children after successful setup
      expect(screen.getByTestId('children')).toBeInTheDocument()
    })

    it('should redirect to signin when API key setup is cancelled', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })

      renderWithSession()

      await waitFor(() => {
        expect(screen.getByTestId('api-key-setup-dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('dialog-cancel')
      await cancelButton.click()

      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })
  })

  describe('Redirect Handling', () => {
    it('should redirect to specified destination after successful API key setup', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })

      // Mock window.location.pathname
      Object.defineProperty(window, 'location', {
        value: { pathname: '/current-page' },
        writable: true,
      })

      renderWithSession({ redirectTo: '/custom-destination' })

      await waitFor(() => {
        expect(screen.getByTestId('api-key-setup-dialog')).toBeInTheDocument()
      })

      const successButton = screen.getByTestId('dialog-success')
      await successButton.click()

      // Should redirect to custom destination
      expect(mockPush).toHaveBeenCalledWith('/custom-destination')
    })

    it('should not redirect if already on the target page', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })

      // Mock window.location.pathname to match redirectTo
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard' },
        writable: true,
      })

      renderWithSession({ redirectTo: '/dashboard' })

      await waitFor(() => {
        expect(screen.getByTestId('api-key-setup-dialog')).toBeInTheDocument()
      })

      const successButton = screen.getByTestId('dialog-success')
      await successButton.click()

      // Should not redirect since already on target page
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})

describe('withApiKeyValidation HOC', () => {
  const MockComponent = vi.fn(({ title }: { title: string }) => (
    <div data-testid="mock-component">{title}</div>
  ))

  beforeEach(() => {
    vi.resetAllMocks()
    mockUseSession.mockReturnValue({
      data: { user: { pipedriveApiKey: 'test-key' } },
      status: 'authenticated',
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('should wrap component with EnhancedLoginFlow', () => {
    const WrappedComponent = withApiKeyValidation(MockComponent, {
      redirectTo: '/dashboard',
      requireApiKey: true,
    })

    render(
      <SessionProvider>
        <WrappedComponent title="Test Title" />
      </SessionProvider>
    )

    expect(screen.getByTestId('mock-component')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('should pass through props to wrapped component', () => {
    const WrappedComponent = withApiKeyValidation(MockComponent)

    render(
      <SessionProvider>
        <WrappedComponent title="Custom Title" />
      </SessionProvider>
    )

    expect(MockComponent).toHaveBeenCalledWith({ title: 'Custom Title' }, {})
  })

  it('should use default options when none provided', () => {
    const WrappedComponent = withApiKeyValidation(MockComponent)

    render(
      <SessionProvider>
        <WrappedComponent title="Test" />
      </SessionProvider>
    )

    expect(screen.getByTestId('mock-component')).toBeInTheDocument()
  })
})

describe('useApiKeyStatus Hook', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseSession.mockReturnValue({
      data: { user: { pipedriveApiKey: 'test-key' } },
      status: 'authenticated',
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('should return API key status information', async () => {
    // Note: Testing hooks requires a test component
    const TestComponent = () => {
      const status = useApiKeyStatus()
      return (
        <div>
          <div data-testid="api-key-valid">{status.apiKeyValid?.toString()}</div>
          <div data-testid="is-checking">{status.isChecking.toString()}</div>
          <div data-testid="has-api-key">{status.hasApiKey.toString()}</div>
          <div data-testid="is-authenticated">{status.isAuthenticated.toString()}</div>
        </div>
      )
    }

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('api-key-valid')).toHaveTextContent('true')
      expect(screen.getByTestId('is-checking')).toHaveTextContent('false')
      expect(screen.getByTestId('has-api-key')).toHaveTextContent('true')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
    })
  })

  it('should handle unauthenticated state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const TestComponent = () => {
      const status = useApiKeyStatus()
      return (
        <div>
          <div data-testid="api-key-valid">{status.apiKeyValid?.toString()}</div>
          <div data-testid="is-checking">{status.isChecking.toString()}</div>
          <div data-testid="has-api-key">{status.hasApiKey.toString()}</div>
          <div data-testid="is-authenticated">{status.isAuthenticated.toString()}</div>
        </div>
      )
    }

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    expect(screen.getByTestId('api-key-valid')).toHaveTextContent('false')
    expect(screen.getByTestId('is-checking')).toHaveTextContent('false')
    expect(screen.getByTestId('has-api-key')).toHaveTextContent('false')
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
  })

  it('should handle users without API keys', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { pipedriveApiKey: null } },
      status: 'authenticated',
    })

    const TestComponent = () => {
      const status = useApiKeyStatus()
      return (
        <div>
          <div data-testid="api-key-valid">{status.apiKeyValid?.toString()}</div>
          <div data-testid="has-api-key">{status.hasApiKey.toString()}</div>
        </div>
      )
    }

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('api-key-valid')).toHaveTextContent('false')
      expect(screen.getByTestId('has-api-key')).toHaveTextContent('false')
    })
  })
}) 