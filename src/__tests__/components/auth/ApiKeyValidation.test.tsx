import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { ApiKeyValidation } from '@/components/auth/ApiKeyValidation'
import * as apiKeyValidation from '@/lib/apiKeyValidation'

// Mock the API key validation functions
vi.mock('@/lib/apiKeyValidation', () => ({
  validateApiKey: vi.fn(),
  getApiKeyErrorMessage: vi.fn(),
}))

describe('ApiKeyValidation', () => {
  const defaultProps = {
    apiKey: '',
    onValidationChange: vi.fn(),
    className: '',
    showStatus: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render nothing when showStatus is false', () => {
      render(<ApiKeyValidation {...defaultProps} showStatus={false} />)
      
      expect(screen.queryByText(/validating/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/valid/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument()
    })

    it('should render initial state when API key is empty', () => {
      render(<ApiKeyValidation {...defaultProps} />)
      
      expect(screen.queryByText(/validating/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/valid/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<ApiKeyValidation {...defaultProps} className="custom-class" />)
      
      const container = screen.getByRole('generic')
      expect(container).toHaveClass('custom-class')
    })
  })

  describe('Validation States', () => {
    it('should show validating state during validation', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      )

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(screen.getByText('Validating API key...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should show success state when validation succeeds', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(true)

      render(<ApiKeyValidation {...defaultProps} apiKey="valid-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('API key is valid')).toBeInTheDocument()
      })

      expect(defaultProps.onValidationChange).toHaveBeenCalledWith(true)
    })

    it('should show error state when validation fails', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(false)

      render(<ApiKeyValidation {...defaultProps} apiKey="invalid-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('API key validation failed')).toBeInTheDocument()
        expect(screen.getByText(/The API key appears to be invalid/)).toBeInTheDocument()
      })

      expect(defaultProps.onValidationChange).toHaveBeenCalledWith(false, 'Invalid API key')
    })

    it('should show error state when validation throws an error', async () => {
      const errorMessage = 'Network error occurred'
      vi.mocked(apiKeyValidation.validateApiKey).mockRejectedValue(new Error('Network error'))
      vi.mocked(apiKeyValidation.getApiKeyErrorMessage).mockReturnValue(errorMessage)

      render(<ApiKeyValidation {...defaultProps} apiKey="error-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('API key validation failed')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      expect(defaultProps.onValidationChange).toHaveBeenCalledWith(false, errorMessage)
    })
  })

  describe('Debouncing', () => {
    it('should debounce validation calls', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(true)

      const { rerender } = render(<ApiKeyValidation {...defaultProps} apiKey="key1" />)
      
      // Change API key quickly
      rerender(<ApiKeyValidation {...defaultProps} apiKey="key2" />)
      rerender(<ApiKeyValidation {...defaultProps} apiKey="key3" />)
      
      // Should not have called validation yet
      expect(apiKeyValidation.validateApiKey).not.toHaveBeenCalled()
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should have called validation only once with the last key
      await waitFor(() => {
        expect(apiKeyValidation.validateApiKey).toHaveBeenCalledTimes(1)
        expect(apiKeyValidation.validateApiKey).toHaveBeenCalledWith('key3')
      })
    })

    it('should not validate empty API keys', () => {
      render(<ApiKeyValidation {...defaultProps} apiKey="" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(apiKeyValidation.validateApiKey).not.toHaveBeenCalled()
    })

    it('should not validate whitespace-only API keys', () => {
      render(<ApiKeyValidation {...defaultProps} apiKey="   " />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(apiKeyValidation.validateApiKey).not.toHaveBeenCalled()
    })
  })

  describe('Manual Validation', () => {
    it('should allow manual validation retry', async () => {
      vi.mocked(apiKeyValidation.validateApiKey)
        .mockResolvedValueOnce(false) // First validation fails
        .mockResolvedValueOnce(true)  // Retry succeeds

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('API key validation failed')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Try again')
      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('API key is valid')).toBeInTheDocument()
      })

      expect(apiKeyValidation.validateApiKey).toHaveBeenCalledTimes(2)
    })

    it('should disable retry button when API key is empty', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(false)

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument()
      })

      // Change to empty API key
      const { rerender } = render(<ApiKeyValidation {...defaultProps} apiKey="" />)
      
      const retryButton = screen.getByText('Try again')
      expect(retryButton).toBeDisabled()
    })
  })

  describe('State Management', () => {
    it('should reset state when API key becomes empty', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(true)

      const { rerender } = render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('API key is valid')).toBeInTheDocument()
      })

      // Change to empty API key
      rerender(<ApiKeyValidation {...defaultProps} apiKey="" />)
      
      expect(screen.queryByText('API key is valid')).not.toBeInTheDocument()
      expect(defaultProps.onValidationChange).toHaveBeenCalledWith(false)
    })

    it('should not re-validate the same API key', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(true)

      const { rerender } = render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(apiKeyValidation.validateApiKey).toHaveBeenCalledTimes(1)
      })

      // Re-render with the same API key
      rerender(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward again
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should not have called validation again
      expect(apiKeyValidation.validateApiKey).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error')
      vi.mocked(apiKeyValidation.validateApiKey).mockRejectedValue(networkError)
      vi.mocked(apiKeyValidation.getApiKeyErrorMessage).mockReturnValue('Unable to connect to Pipedrive')

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('Unable to connect to Pipedrive')).toBeInTheDocument()
      })
    })

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      vi.mocked(apiKeyValidation.validateApiKey).mockRejectedValue(rateLimitError)
      vi.mocked(apiKeyValidation.getApiKeyErrorMessage).mockReturnValue('Too many validation attempts')

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(screen.getByText('Too many validation attempts')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper loading state accessibility', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      )

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      const loadingSpinner = screen.getByRole('status')
      expect(loadingSpinner).toBeInTheDocument()
    })

    it('should have proper button accessibility', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(false)

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        const retryButton = screen.getByText('Try again')
        expect(retryButton).toBeInTheDocument()
        expect(retryButton).toHaveAttribute('disabled')
      })
    })
  })

  describe('Visual Feedback', () => {
    it('should show appropriate icons for different states', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(true)

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        // Should show checkmark icon for success
        const successIcon = screen.getByText('API key is valid').previousElementSibling
        expect(successIcon).toHaveClass('h-4', 'w-4')
      })
    })

    it('should show error icon for failed validation', async () => {
      vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(false)

      render(<ApiKeyValidation {...defaultProps} apiKey="test-key" />)
      
      // Fast-forward past the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        // Should show X icon for error
        const errorIcon = screen.getByText('API key validation failed').previousElementSibling
        expect(errorIcon).toHaveClass('h-4', 'w-4')
      })
    })
  })
}) 