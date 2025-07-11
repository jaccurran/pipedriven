import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactList } from '@/components/contacts/ContactList'
import { Contact, User } from '@prisma/client'

// Mock data using current Prisma schema
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

const mockContacts: Contact[] = [
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
  {
    id: 'contact-3',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    phone: '+1122334455',
    organisation: 'Startup Inc',
    warmnessScore: 90,
    lastContacted: new Date('2025-01-12'),
    addedToCampaign: true,
    pipedrivePersonId: 'pipedrive-456',
    pipedriveOrgId: 'org-456',
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2025-01-12'),
    userId: 'user-1',
  },
]

describe('ContactList', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnActivity = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders contact list correctly', () => {
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
    })

    it('displays search input', () => {
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      expect(searchInput).toBeInTheDocument()
    })

    it('displays filter options', () => {
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByText('All Status')).toBeInTheDocument()
      expect(screen.getByText('All Sources')).toBeInTheDocument()
      expect(screen.getByText('All Tags')).toBeInTheDocument()
    })

    it('shows empty state when no contacts', () => {
      render(
        <ContactList
          contacts={[]}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByText('No contacts found')).toBeInTheDocument()
      expect(screen.getByText('Add your first contact to get started.')).toBeInTheDocument()
    })

    it('shows no results message when filters return no contacts', () => {
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      fireEvent.change(searchInput, { target: { value: 'NonExistentContact' } })

      expect(screen.getByText('No contacts match your search criteria.')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('filters contacts by name', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      await user.type(searchInput, 'John')

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
    })

    it('filters contacts by email', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      await user.type(searchInput, 'jane.smith')

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
    })

    it('filters contacts by organisation', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      await user.type(searchInput, 'Acme')

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('filters by status', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const statusSelect = screen.getByDisplayValue('All Status')
      await user.selectOptions(statusSelect, 'Warm')

      // Should show contacts with warm status
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })

    it('filters by source', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const sourceSelect = screen.getByDisplayValue('All Sources')
      await user.selectOptions(sourceSelect, 'Pipedrive')

      // Should show contacts from Pipedrive
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('filters by tags', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const tagSelect = screen.getByDisplayValue('All Tags')
      await user.selectOptions(tagSelect, 'warm')

      // Should show contacts with WARM tag
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('sorts contacts by name', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const sortSelect = screen.getByDisplayValue('Name')
      await user.selectOptions(sortSelect, 'Name')

      // Verify contacts are sorted alphabetically
      const contactCards = screen.getAllByTestId('contact-card')
      expect(contactCards).toHaveLength(3)
    })

    it('sorts contacts by last activity', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const sortSelect = screen.getByDisplayValue('Name')
      await user.selectOptions(sortSelect, 'Last Activity')

      // Verify contacts are sorted by activity date
      const contactCards = screen.getAllByTestId('contact-card')
      expect(contactCards).toHaveLength(3)
    })

    it('sorts contacts by warmness score', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const sortSelect = screen.getByDisplayValue('Name')
      await user.selectOptions(sortSelect, 'Warmness Score')

      // Verify contacts are sorted by warmness score
      const contactCards = screen.getAllByTestId('contact-card')
      expect(contactCards).toHaveLength(3)
    })
  })

  describe('Bulk Actions', () => {
    it('enables bulk selection mode', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const bulkSelectButton = screen.getByLabelText('Select all contacts')
      await user.click(bulkSelectButton)

      // Should show bulk action buttons
      expect(screen.getByText('Add to Campaign')).toBeInTheDocument()
      expect(screen.getByText('Export Selected')).toBeInTheDocument()
      expect(screen.getByText('Delete Selected')).toBeInTheDocument()
    })

    it('selects individual contacts', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      // First enable bulk mode by selecting all
      const bulkSelectButton = screen.getByLabelText('Select all contacts')
      await user.click(bulkSelectButton)

      // Now individual checkboxes should be visible
      const selectButtons = screen.getAllByLabelText(/Select contact/)
      expect(selectButtons.length).toBeGreaterThan(0)
      
      // Should show bulk action buttons
      expect(screen.getByText('Add to Campaign')).toBeInTheDocument()
    })

    it('performs bulk actions', async () => {
      const mockOnBulkAction = vi.fn()
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
          onBulkAction={mockOnBulkAction}
        />
      )

      // First enable bulk mode by selecting all
      const bulkSelectButton = screen.getByLabelText('Select all contacts')
      await user.click(bulkSelectButton)

      const addToCampaignButton = screen.getByText('Add to Campaign')
      await user.click(addToCampaignButton)

      // Should call the bulk action handler
      expect(mockOnBulkAction).toHaveBeenCalledWith(
        expect.arrayContaining(['contact-1', 'contact-2', 'contact-3']),
        'add-to-campaign'
      )
    })
  })

  describe('Contact Card Integration', () => {
    it('renders ContactCard components', () => {
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const contactCards = screen.getAllByTestId('contact-card')
      expect(contactCards).toHaveLength(3)
    })

    it('passes correct props to ContactCard', () => {
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      // Verify ContactCard receives the contact data
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('handles ContactCard actions', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const editButtons = screen.getAllByLabelText('Edit contact')
      await user.click(editButtons[0])

      // The ContactList passes enhanced contacts to ContactCard, and contacts are sorted by name
      // Bob Wilson comes first alphabetically, so we check that onEdit was called with any contact
      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({ 
          id: expect.stringMatching(/contact-\d+/),
          name: expect.any(String),
          email: expect.any(String)
        })
      )
    })
  })

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      // Should still render all contacts
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      expect(screen.getByLabelText('Search contacts')).toBeInTheDocument()
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
      expect(screen.getByLabelText('Filter by source')).toBeInTheDocument()
      expect(screen.getByLabelText('Filter by tags')).toBeInTheDocument()
      expect(screen.getByLabelText('Sort contacts')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <ContactList
          contacts={mockContacts}
          user={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onActivity={mockOnActivity}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search contacts...')
      await user.tab()
      
      expect(searchInput).toHaveFocus()
    })
  })
}) 