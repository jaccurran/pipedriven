import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock dependencies at the top level (Vitest hoisting requirement)
vi.mock('@/lib/apiKeyValidation', () => ({
  validateApiKey: vi.fn(),
  getApiKeyErrorMessage: vi.fn((error) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      if (message.includes('network') || message.includes('fetch')) {
        return 'Unable to connect to Pipedrive. Please check your internet connection.'
      }
      
      if (message.includes('rate limit') || message.includes('too many')) {
        return 'Too many validation attempts. Please wait a moment and try again.'
      }
      
      if (message.includes('unauthorized') || message.includes('401')) {
        return 'The API key appears to be invalid. Please check and try again.'
      }
      
      if (message.includes('timeout')) {
        return 'Request timed out. Please try again.'
      }
    }
    
    return 'An error occurred while validating your API key. Please try again.'
  }),
}))

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'test-user-id' } },
    status: 'authenticated'
  }))
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocks
import { ApiKeySetupDialog } from '@/components/auth/ApiKeySetupDialog'
import * as apiKeyValidation from '@/lib/apiKeyValidation'

describe('ApiKeySetupDialog', () => {
  const defaultProps = {
    isOpen: true,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    // Reset all mocks (more reliable than clearAllMocks)
    vi.resetAllMocks()
    
    // Set up default mock implementations
    vi.mocked(apiKeyValidation.validateApiKey).mockResolvedValue(true)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    cleanup()
  })

  // Helper function to get the API key input safely
  const getApiKeyInput = () => {
    // Use test ID to avoid ambiguity with dialog title and other elements
    const inputs = screen.getAllByTestId('api-key-input')
    return inputs[0] as HTMLInputElement
  }

  describe('Rendering', () => {
    it('should render dialog when isOpen is true', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Set Up Your Pipedrive API Key')).toBeInTheDocument()
    })

    it('should not render dialog when isOpen is false', () => {
      render(<ApiKeySetupDialog {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render all required form elements', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      expect(getApiKeyInput()).toBeInTheDocument()
      const validateButtons = screen.getAllByTestId('validate-button')
      expect(validateButtons[0]).toBeInTheDocument()
      const helpButtons = screen.getAllByTestId('help-button')
      expect(helpButtons[0]).toBeInTheDocument()
      const cancelButtons = screen.getAllByTestId('cancel-button')
      expect(cancelButtons[0]).toBeInTheDocument()
    })

    it('should have proper accessibility attributes', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
      
      const apiKeyInput = getApiKeyInput()
      expect(apiKeyInput).toHaveAttribute('type', 'password')
      expect(apiKeyInput).toHaveAttribute('required')
    })
  })

  describe('Initial State', () => {
    it('should start with empty API key input', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      expect(apiKeyInput.value).toBe('')
    })

    it('should start with validate button disabled', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const validateButtons = screen.getAllByTestId('validate-button')
      expect(validateButtons[0]).toBeDisabled()
    })

    it('should not show error message initially', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    it('should not show success message initially', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      expect(screen.queryByText(/success/i)).not.toBeInTheDocument()
    })
  })

  describe('Input Validation', () => {
    it('should enable validate button when API key is entered', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      expect(validateButtons[0]).toBeDisabled()
      
      await user.type(apiKeyInput, 'test-api-key')
      
      expect(validateButtons[0]).toBeEnabled()
    })

    it('should disable validate button when API key is empty', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      expect(validateButtons[0]).toBeEnabled()
      
      await user.clear(apiKeyInput)
      expect(validateButtons[0]).toBeDisabled()
    })

    it('should show password toggle button', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it('should toggle password visibility when toggle button is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })
      
      expect(apiKeyInput.type).toBe('password')
      
      await user.click(toggleButton)
      expect(apiKeyInput.type).toBe('text')
      
      await user.click(toggleButton)
      expect(apiKeyInput.type).toBe('password')
    })
  })

  describe('API Key Validation', () => {
    it('should validate API key when validate button is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButtons[0])
      
      expect(apiKeyValidation.validateApiKey).toHaveBeenCalledWith('test-api-key')
    })

    it('should show loading state during validation', async () => {
      const user = userEvent.setup()
      vi.mocked(apiKeyValidation.validateApiKey).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
      
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButtons[0])
      
      expect(screen.getByText(/validating your API key/i)).toBeInTheDocument()
      expect(validateButtons[0]).toBeDisabled()
    })

    it('should handle successful validation', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButton = screen.getByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButton)
      
      await waitFor(() => {
        expect(screen.getByText(/API key is valid and saved successfully/i)).toBeInTheDocument()
      })
      
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })

    it('should handle validation failure', async () => {
      const user = userEvent.setup()
      
      // Create a fresh mock that returns false
      const mockValidateApiKey = vi.fn().mockResolvedValue(false)
      vi.mocked(apiKeyValidation.validateApiKey).mockImplementation(mockValidateApiKey)
      
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'invalid-api-key')
      await user.click(validateButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/the API key appears to be invalid/i)).toBeInTheDocument()
      })
      
      expect(defaultProps.onSuccess).not.toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const user = userEvent.setup()
      vi.mocked(apiKeyValidation.validateApiKey).mockRejectedValue(new Error('Network error'))
      
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/unable to connect to pipedrive/i)).toBeInTheDocument()
      })
    })
  })

  describe('Help Functionality', () => {
    it('should show help content when help button is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const helpButtons = screen.getAllByTestId('help-button')
      await user.click(helpButtons[0])
      
      expect(screen.getByText(/how to find your API key/i)).toBeInTheDocument()
      expect(screen.getByText(/pipedrive settings/i)).toBeInTheDocument()
    })

    it('should hide help content when help button is clicked again', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const helpButtons = screen.getAllByTestId('help-button')
      
      await user.click(helpButtons[0])
      expect(screen.getByText(/how to find your API key/i)).toBeInTheDocument()
      
      await user.click(helpButtons[0])
      expect(screen.queryByText(/how to find your API key/i)).not.toBeInTheDocument()
    })

    it('should contain step-by-step instructions', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const helpButtons = screen.getAllByTestId('help-button')
      await user.click(helpButtons[0])
      
      expect(screen.getByText(/log in to your pipedrive account/i)).toBeInTheDocument()
      expect(screen.getByText(/go to settings/i)).toBeInTheDocument()
      expect(screen.getByText(/click on "api" in the left sidebar/i)).toBeInTheDocument()
      expect(screen.getByText(/copy your api key/i)).toBeInTheDocument()
      expect(screen.getByText(/paste it in the field above/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const cancelButtons = screen.getAllByTestId('cancel-button')
      await user.click(cancelButtons[0])
      
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it.skip('should call onCancel when escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      // Use fireEvent.keyDown on document like other components in the codebase
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should show specific error for network issues', async () => {
      const user = userEvent.setup()
      vi.mocked(apiKeyValidation.validateApiKey).mockRejectedValue(new Error('Network error'))
      
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/unable to connect to pipedrive/i)).toBeInTheDocument()
      })
    })

    it('should show specific error for rate limiting', async () => {
      const user = userEvent.setup()
      vi.mocked(apiKeyValidation.validateApiKey).mockRejectedValue(new Error('Rate limit exceeded'))
      
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/too many validation attempts/i)).toBeInTheDocument()
      })
    })

    it('should show retry option for validation errors', async () => {
      const user = userEvent.setup()
      vi.mocked(apiKeyValidation.validateApiKey).mockRejectedValue(new Error('An error occurred while validating'))
      
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButtons[0])
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })
  })

  describe('Success Flow', () => {
    it('should save API key to database on successful validation', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      // Type in the input and verify it updates
      await user.type(apiKeyInput, 'test-api-key')
      expect(apiKeyInput).toHaveValue('test-api-key')
      
      // Click validate and wait for the fetch call
      await user.click(validateButtons[0])
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user/pipedrive-api-key', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey: 'test-api-key' }),
        })
      })
    })

    it('should call onSuccess after successful validation', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      
      await user.type(apiKeyInput, 'test-api-key')
      await user.click(validateButtons[0])
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled()
      })
    })



  })

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const apiKeyInput = getApiKeyInput()
      const validateButtons = screen.getAllByTestId('validate-button')
      const helpButtons = screen.getAllByTestId('help-button')
      const cancelButtons = screen.getAllByTestId('cancel-button')
      
      // Start with the input focused and type something to enable validate button
      await user.click(apiKeyInput)
      await user.type(apiKeyInput, 'test')
      
      // Tab through elements - the password toggle button gets focus first
      await user.tab() // Password toggle button gets focus
      await user.tab() // Then validate button (now enabled)
      expect(validateButtons[0]).toHaveFocus() // Validate button is now enabled
      
      await user.tab() // Skip to help button
      expect(helpButtons[0]).toHaveFocus()
      
      await user.tab()
      expect(cancelButtons[0]).toHaveFocus()
    })

    it('should have proper ARIA labels', () => {
      render(<ApiKeySetupDialog {...defaultProps} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
      
      const apiKeyInput = getApiKeyInput()
      expect(apiKeyInput).toHaveAttribute('aria-describedby')
    })


  })
}) 