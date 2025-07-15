import React from 'react'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ContactForm } from '@/components/contacts/ContactForm'

// Mock fetch for API calls
global.fetch = vi.fn()

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CONSULTANT' as const,
  pipedriveApiKey: 'test-api-key'
}

describe('ContactForm with Organization Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Basic Form Functionality', () => {
    it('renders all form fields correctly', () => {
      render(<ContactForm onSubmit={vi.fn()} />)
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/organization/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/warmness score/i)).toBeInTheDocument()
    })

    it('populates form with initial values', () => {
      const initialValues = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organisation: 'Acme Corp',
        warmnessScore: 7
      }

      render(<ContactForm initialValues={initialValues} onSubmit={vi.fn()} />)
      
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
      expect(screen.getByDisplayValue('7')).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      render(<ContactForm onSubmit={mockOnSubmit} />)
      
      const submitButton = screen.getByRole('button', { name: /save contact/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('submits form with valid data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      render(<ContactForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/phone/i), '+1234567890')
      await user.type(screen.getByLabelText(/organization/i), 'Acme Corp')
      
      const submitButton = screen.getByRole('button', { name: /save contact/i })
      await user.click(submitButton)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organisation: 'Acme Corp',
        warmnessScore: 5
      })
    })
  })

  describe('Organization Search Functionality', () => {
    it('shows organization search dropdown when typing in organization field', async () => {
      const user = userEvent.setup()
      
      // Mock local organization search
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [
              { id: 'org-1', name: 'Acme Corporation', contactCount: 5 },
              { id: 'org-2', name: 'Acme Solutions', contactCount: 3 }
            ],
            pagination: { total: 2 }
          }
        })
      } as Response)

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'Acme')
      
      // Wait for search results to appear
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
        expect(screen.getByText('Acme Solutions')).toBeInTheDocument()
      })
    })

    it('searches both local and Pipedrive organizations', async () => {
      const user = userEvent.setup()
      
      // Mock local organization search
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [
              { id: 'org-1', name: 'Acme Corp', contactCount: 5 }
            ],
            pagination: { total: 1 }
          }
        })
      } as Response)

      // Mock Pipedrive organization search
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 'pd-1', name: 'Acme Pipedrive', address: '123 Main St' }
          ]
        })
      } as Response)

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'Acme')
      
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('Acme Pipedrive')).toBeInTheDocument()
      })
    })

    it('allows selecting an existing organization', async () => {
      const user = userEvent.setup()
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [
              { id: 'org-1', name: 'Acme Corporation', contactCount: 5 }
            ],
            pagination: { total: 1 }
          }
        })
      } as Response)

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'Acme')
      
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Acme Corporation'))
      
      expect(orgInput).toHaveValue('Acme Corporation')
    })

    it('shows option to create new organization when no matches found', async () => {
      const user = userEvent.setup()
      
      // Mock empty search results
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [],
            pagination: { total: 0 }
          }
        })
      } as Response)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      } as Response)

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'New Company')
      
      await waitFor(() => {
        expect(screen.getByText(/create "New Company"/i)).toBeInTheDocument()
      })
    })

    it('creates new organization when option is selected', async () => {
      const user = userEvent.setup()
      
      // Mock empty search results
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [],
            pagination: { total: 0 }
          }
        })
      } as Response)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      } as Response)

      // Mock organization creation
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'new-org-1', name: 'New Company' }
        })
      } as Response)

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'New Company')
      
      await waitFor(() => {
        expect(screen.getByText(/create "New Company"/i)).toBeInTheDocument()
      })
      
      await user.click(screen.getByText(/create "New Company"/i))
      
      // Verify organization creation API was called
      expect(fetch).toHaveBeenCalledWith('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Company' })
      })
    })

    it('handles organization search errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock search error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'Acme')
      
      // Should not crash and should still allow manual input
      expect(orgInput).toHaveValue('Acme')
    })

    it('debounces organization search to avoid excessive API calls', async () => {
      const user = userEvent.setup()
      
      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      
      // Type quickly
      await user.type(orgInput, 'A')
      await user.type(orgInput, 'c')
      await user.type(orgInput, 'm')
      await user.type(orgInput, 'e')
      
      // Wait for debounce
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1)
      }, { timeout: 1000 })
    })

    it('shows loading state during organization search', async () => {
      const user = userEvent.setup()
      
      // Mock slow response
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { organizations: [], pagination: { total: 0 } }
            })
          } as Response), 100)
        )
      )

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'Acme')
      
      // Should show loading indicator
      expect(screen.getByText(/searching/i)).toBeInTheDocument()
    })

    it('distinguishes between local and Pipedrive organizations in results', async () => {
      const user = userEvent.setup()
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [
              { id: 'org-1', name: 'Local Corp', contactCount: 5 }
            ],
            pagination: { total: 1 }
          }
        })
      } as Response)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 'pd-1', name: 'Pipedrive Corp', address: '123 Main St' }
          ]
        })
      } as Response)

      render(<ContactForm onSubmit={vi.fn()} />)
      
      const orgInput = screen.getByLabelText(/organization/i)
      await user.type(orgInput, 'Corp')
      
      await waitFor(() => {
        expect(screen.getByText('Local Corp')).toBeInTheDocument()
        expect(screen.getByText('Pipedrive Corp')).toBeInTheDocument()
        expect(screen.getByText(/local/i)).toBeInTheDocument()
        expect(screen.getByText(/pipedrive/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission with Organization', () => {
    it('submits form with selected organization ID', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [
              { id: 'org-1', name: 'Acme Corp', contactCount: 5 }
            ],
            pagination: { total: 1 }
          }
        })
      } as Response)

      const { container } = render(<ContactForm onSubmit={mockOnSubmit} />)
      
      // Use container to scope the search to this specific form
      const nameInput = container.querySelector('input[placeholder="Enter contact name"]') as HTMLInputElement
      const emailInput = container.querySelector('input[placeholder="Enter email address"]') as HTMLInputElement
      const orgInput = container.querySelector('input[placeholder="Enter organization"]') as HTMLInputElement
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(orgInput, 'Acme')
      
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Acme Corp'))
      
      const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement
      await user.click(submitButton)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        organisation: 'Acme Corp',
        organizationId: 'org-1',
        warmnessScore: 5
      })
    })

    it('submits form with new organization when created', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: [],
            pagination: { total: 0 }
          }
        })
      } as Response)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      } as Response)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'new-org-1', name: 'New Company' }
        })
      } as Response)

      const { container } = render(<ContactForm onSubmit={mockOnSubmit} />)
      
      const nameInput = container.querySelector('input[placeholder="Enter contact name"]') as HTMLInputElement
      const emailInput = container.querySelector('input[placeholder="Enter email address"]') as HTMLInputElement
      const orgInput = container.querySelector('input[placeholder="Enter organization"]') as HTMLInputElement
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(orgInput, 'New Company')
      
      await waitFor(() => {
        expect(screen.getByText(/create "New Company"/i)).toBeInTheDocument()
      })
      
      await user.click(screen.getByText(/create "New Company"/i))
      
      const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement
      await user.click(submitButton)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        organisation: 'New Company',
        organizationId: 'new-org-1',
        warmnessScore: 5
      })
    })
  })
}) 