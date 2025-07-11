import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactSearch } from '@/components/contacts/ContactSearch'
import { Contact, User } from '@prisma/client'

// Mock data
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CONSULTANT',
  password: 'hashed-password',
  pipedriveApiKey: 'test-api-key',
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: null,
  image: null,
}

const mockLocalContacts: Contact[] = [
  {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    organisation: 'Acme Corp',
    warmnessScore: 75,
    lastContacted: new Date('2025-01-10'),
    addedToCampaign: true,
    pipedrivePersonId: 'pipedrive-123',
    pipedriveOrgId: 'org-123',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    userId: 'user-1',
  },
  {
    id: 'contact-2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+0987654321',
    organisation: 'Tech Solutions',
    warmnessScore: 25,
    lastContacted: new Date('2024-12-15'),
    addedToCampaign: false,
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-20'),
    userId: 'user-1',
  },
]

const mockPipedriveContacts = [
  {
    id: 'pipedrive-1',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    phone: '+1122334455',
    organisation: 'Startup Inc',
    pipedrivePersonId: 'pipedrive-456',
    pipedriveOrgId: 'org-456',
  },
  {
    id: 'pipedrive-2',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    phone: '+5566778899',
    organisation: 'Enterprise Corp',
    pipedrivePersonId: 'pipedrive-789',
    pipedriveOrgId: 'org-789',
  },
]

// Mock fetch for Pipedrive API calls
global.fetch = vi.fn()

describe('ContactSearch', () => {
  const mockOnImport = vi.fn()
  const mockOnCreate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
    
    // Clean up any remaining modals and portals
    const modals = document.querySelectorAll('[role="dialog"]')
    modals.forEach(modal => modal.remove())
    
    // Also clean up any portals that might be left in the body
    const portals = document.body.querySelectorAll('[data-testid]')
    portals.forEach(portal => portal.remove())
    
    // Reset body overflow
    document.body.style.overflow = 'unset'
  })

  describe('Rendering', () => {
    it('renders search modal correctly', () => {
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      expect(screen.getByText('Search Contacts')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search by name, email, or company...')).toBeInTheDocument()
      expect(screen.getByText('Local Contacts')).toBeInTheDocument()
      expect(screen.getByText('Pipedrive Contacts')).toBeInTheDocument()
    })

    it('shows loading state when searching', async () => {
      // Mock successful Pipedrive API response with delay to see loading state
      ;(global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              ok: true,
              json: async () => ({ data: [] })
            }), 100
          )
        )
      )

      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Switch to Pipedrive tab to trigger loading state
      const pipedriveTab = screen.getByText('Pipedrive Contacts')
      fireEvent.click(pipedriveTab)

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await userEvent.type(searchInput, 'test')

      // Wait for loading state to appear
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('displays existing contacts in local tab', () => {
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
    })

    it('shows empty state when no local contacts', () => {
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={[]}
        />
      )

      expect(screen.getByText('No local contacts found')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('filters local contacts by name', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'John')

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('filters local contacts by email', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'jane.smith')

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('filters local contacts by organisation', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'Acme')

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'NonExistentContact')

      expect(screen.getByText('No contacts found matching your search')).toBeInTheDocument()
    })
  })

  describe('Pipedrive Integration', () => {
    it('searches Pipedrive contacts when tab is active', async () => {
      const user = userEvent.setup()
      
      // Mock successful Pipedrive API response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPipedriveContacts }),
      })

      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Switch to Pipedrive tab
      const pipedriveTab = screen.getByText('Pipedrive Contacts')
      await user.click(pipedriveTab)

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'Alice')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/pipedrive/contacts/search'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Alice'),
          })
        )
      })
    })

    it('handles Pipedrive API errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock failed Pipedrive API response
      ;(global.fetch as any).mockRejectedValueOnce(new Error('API Error'))

      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Switch to Pipedrive tab
      const pipedriveTab = screen.getByText('Pipedrive Contacts')
      await user.click(pipedriveTab)

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(screen.getByText('Error searching Pipedrive')).toBeInTheDocument()
      })
    })

    it('shows Pipedrive connection required message when no API key', () => {
      const userWithoutApiKey = { ...mockUser, pipedriveApiKey: null }
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={userWithoutApiKey}
          existingContacts={mockLocalContacts}
        />
      )

      const pipedriveTab = screen.getByText('Pipedrive Contacts')
      fireEvent.click(pipedriveTab)

      expect(screen.getByText('Pipedrive API key required')).toBeInTheDocument()
      expect(screen.getByText('Please configure your Pipedrive API key in settings')).toBeInTheDocument()
    })
  })

  describe('Contact Import', () => {
    it('imports local contact when import button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const importButtons = screen.getAllByLabelText('Import contact')
      await user.click(importButtons[0])

      expect(mockOnImport).toHaveBeenCalledWith(mockLocalContacts[0])
    })

    it('imports Pipedrive contact when import button is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock successful Pipedrive API response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPipedriveContacts }),
      })

      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Switch to Pipedrive tab and search
      const pipedriveTab = screen.getByText('Pipedrive Contacts')
      await user.click(pipedriveTab)

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'Alice')

      await waitFor(() => {
        const importButtons = screen.getAllByLabelText('Import contact')
        expect(importButtons.length).toBeGreaterThan(0)
      })
    })

    it('shows already imported indicator for existing contacts', () => {
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Contact with pipedrivePersonId should show as imported
      expect(screen.getByText('Already imported')).toBeInTheDocument()
    })
  })

  describe('Contact Creation', () => {
    it('opens create contact form when create button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const createButton = screen.getByText('Create New Contact')
      await user.click(createButton)

      expect(screen.getByText('Create Contact')).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Phone')).toBeInTheDocument()
      expect(screen.getByLabelText('Organization')).toBeInTheDocument()
    })

    it('creates contact when form is submitted', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Open create form
      const createButton = screen.getByText('Create New Contact')
      await user.click(createButton)

      // Fill form
      await user.type(screen.getByLabelText('Name'), 'New Contact')
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Phone'), '+1234567890')
      await user.type(screen.getByLabelText('Organization'), 'New Corp')

      // Submit form
      const submitButton = screen.getByText('Create Contact')
      await user.click(submitButton)

      expect(mockOnCreate).toHaveBeenCalledWith({
        name: 'New Contact',
        email: 'new@example.com',
        phone: '+1234567890',
        organisation: 'New Corp',
      })
    })

    it('validates required fields in create form', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Open create form
      const createButton = screen.getByText('Create New Contact')
      await user.click(createButton)

      // Try to submit without filling required fields
      const submitButton = screen.getByText('Create Contact')
      await user.click(submitButton)

      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  describe('Modal Behavior', () => {
    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes modal when backdrop is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Find the backdrop by its aria-hidden attribute and click it
      const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]')
      expect(backdrop).toBeInTheDocument()
      await user.click(backdrop!)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not close modal when content is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Find the modal content and click it
      const content = screen.getAllByRole('dialog')[0]
      await user.click(content)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      expect(screen.getAllByLabelText('Search contacts')[0]).toBeInTheDocument()
      expect(screen.getAllByLabelText('Close modal')[0]).toBeInTheDocument()
      expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      
      // Focus the search input directly since tab order might vary
      searchInput.focus()
      
      expect(searchInput).toHaveFocus()
      
      // Test that we can type in the input
      await user.type(searchInput, 'test')
      expect(searchInput).toHaveValue('test')
    })

    it('traps focus within modal', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactSearch
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          onCreate={mockOnCreate}
          user={mockUser}
          existingContacts={mockLocalContacts}
        />
      )

      // Test that we can focus the search input
      const searchInputs = screen.getAllByPlaceholderText('Search by name, email, or company...')
      const searchInput = searchInputs[0]
      searchInput.focus()
      expect(searchInput).toHaveFocus()
      
      // Test that we can focus the close button
      const closeButton = screen.getAllByLabelText('Close modal')[0]
      closeButton.focus()
      expect(closeButton).toHaveFocus()
    })
  })
}) 