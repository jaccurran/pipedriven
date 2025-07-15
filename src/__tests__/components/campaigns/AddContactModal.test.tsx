import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddContactModal } from '@/components/campaigns/AddContactModal'
import { Input } from '@/components/ui/Input'

const mockLocalContacts = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com' },
]

const mockPipedriveContacts = [
  { id: 'pd-1', name: 'Charlie Pipedrive', email: 'charlie@pipedrive.com' },
]

describe('AddContactModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSelect = vi.fn()
  const mockOnCreate = vi.fn()
  const mockSearchPipedrive = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  it('Input component works correctly in isolation', async () => {
    const mockOnChange = vi.fn()
    render(<Input value="" onChange={mockOnChange} placeholder="Test input" />)
    
    const input = screen.getByPlaceholderText('Test input')
    expect(input).toBeInTheDocument()
    
    // Use fireEvent.change instead of userEvent.type for consistent behavior
    fireEvent.change(input, { target: { value: 'test' } })
    expect(mockOnChange).toHaveBeenCalledWith('test')
  })

  it('renders search input and local results after debounce', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={mockLocalContacts}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    expect(input).toBeInTheDocument()
    
    // Typing should show local results after debounce
    fireEvent.change(input, { target: { value: 'Alice' } })
    
    // Wait for debounced search to complete (400ms + buffer)
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    }, { timeout: 500 })
    
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
  })

  it('offers to search Pipedrive if no local match after debounce', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={mockLocalContacts}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Zelda' } })
    
    // Wait for debounced search to complete
    await waitFor(() => {
      expect(mockSearchPipedrive).toHaveBeenCalledWith('Zelda')
    }, { timeout: 500 })
    
    // Should show "No contacts found" and "Create New Contact" button
    expect(screen.getByText(/no contacts found/i)).toBeInTheDocument()
    expect(screen.getByText(/create new contact/i)).toBeInTheDocument()
  })

  it('shows Pipedrive results when available', () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={mockLocalContacts}
        pipedriveContacts={mockPipedriveContacts}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    expect(screen.getByText('Charlie Pipedrive')).toBeInTheDocument()
    expect(screen.getByText(/from pipedrive/i)).toBeInTheDocument()
  })

  it('always offers to create new contact after debounce', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={mockLocalContacts}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Zelda' } })
    
    // Wait for debounced search to complete
    await waitFor(() => {
      expect(screen.getByText(/create new contact/i)).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('calls onSelect when a local or Pipedrive contact is chosen', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={mockLocalContacts}
        pipedriveContacts={mockPipedriveContacts}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    
    // First test: click on Pipedrive contact (which is always visible)
    await userEvent.click(screen.getByText('Charlie Pipedrive'))
    expect(mockOnSelect).toHaveBeenCalledWith(mockPipedriveContacts[0])
    
    // Reset mock
    mockOnSelect.mockClear()
    
    // Second test: search for and click on local contact
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Alice' } })
    
    // Wait for debounced search to complete
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    }, { timeout: 500 })
    
    await userEvent.click(screen.getByText('Alice Johnson'))
    expect(mockOnSelect).toHaveBeenCalledWith(mockLocalContacts[0])
  })

  it('calls onCreate when create new contact is clicked', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={mockLocalContacts}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Zelda' } })
    
    // Wait for debounced search to complete
    await waitFor(() => {
      expect(screen.getByText(/create new contact/i)).toBeInTheDocument()
    }, { timeout: 500 })
    
    await userEvent.click(screen.getByText(/create new contact/i))
    expect(mockOnCreate).toHaveBeenCalledWith('Zelda')
  })

  it('closes when cancel is clicked', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={mockLocalContacts}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })
}) 

describe('AddContactModal - Unified Search', () => {
  const mockOnClose = vi.fn()
  const mockOnSelect = vi.fn()
  const mockOnCreate = vi.fn()
  const mockOnSearchPipedrive = vi.fn()

  const localContacts = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com' },
    { id: '3', name: 'Charlie Pipedrive', email: 'charlie@pipedrive.com' }, // duplicate with pipedrive
  ]
  const pipedriveContacts = [
    { id: 'pd-1', name: 'Charlie Pipedrive', email: 'charlie@pipedrive.com' },
    { id: 'pd-2', name: 'Daisy Remote', email: 'daisy@remote.com' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('debounced search triggers local and pipedrive search, shows spinner', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={localContacts}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockOnSearchPipedrive}
        loadingPipedrive={true}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'charlie' } })
    // Wait for debounce
    await waitFor(() => {
      expect(mockOnSearchPipedrive).toHaveBeenCalledWith('charlie')
    }, { timeout: 500 })
    // Spinner should be shown
    expect(screen.getByText(/searching/i)).toBeInTheDocument()
  })

  it('shows unified results: local first, then pipedrive, deduplicated', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={localContacts}
        pipedriveContacts={pipedriveContacts}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockOnSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'charlie' } })
    await waitFor(() => {
      expect(screen.getByText('Charlie Pipedrive')).toBeInTheDocument()
    }, { timeout: 500 })
    // Only one Charlie Pipedrive (local preferred)
    expect(screen.getAllByText('Charlie Pipedrive').length).toBe(1)
    // Local badge present
    expect(screen.getByText(/local/i)).toBeInTheDocument()
    // Daisy Remote (from pipedrive)
    expect(screen.getByText('Daisy Remote')).toBeInTheDocument()
    expect(screen.getByText(/from pipedrive/i)).toBeInTheDocument()
  })

  it('shows "No contacts found" if no results', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={[]}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockOnSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Zelda' } })
    await waitFor(() => {
      expect(screen.getByText(/no contacts found/i)).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('always shows create new contact button when search is non-empty', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={localContacts}
        pipedriveContacts={pipedriveContacts}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockOnSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Zelda' } })
    await waitFor(() => {
      expect(screen.getByText(/create new contact/i)).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('calls onCreate and auto-selects new contact', async () => {
    // Simulate create: onCreate adds to local and triggers onSelect
    let contacts = [...localContacts]
    const handleCreate = (query: string) => {
      const newContact = { id: 'new-1', name: query, email: `${query}@test.com` }
      contacts.push(newContact)
      mockOnSelect(newContact)
      mockOnClose()
    }
    render(
      <AddContactModal
        isOpen={true}
        localContacts={contacts}
        pipedriveContacts={[]}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={handleCreate}
        onSearchPipedrive={mockOnSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Zelda' } })
    await waitFor(() => {
      expect(screen.getByText(/create new contact/i)).toBeInTheDocument()
    }, { timeout: 500 })
    await userEvent.click(screen.getByText(/create new contact/i))
    expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Zelda' }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onSelect and closes when a contact is chosen', async () => {
    render(
      <AddContactModal
        isOpen={true}
        localContacts={localContacts}
        pipedriveContacts={pipedriveContacts}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        onSearchPipedrive={mockOnSearchPipedrive}
        loadingPipedrive={false}
      />
    )
    const input = screen.getByPlaceholderText(/search contacts/i)
    fireEvent.change(input, { target: { value: 'Bob' } })
    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    }, { timeout: 500 })
    await userEvent.click(screen.getByText('Bob Smith'))
    expect(mockOnSelect).toHaveBeenCalledWith(localContacts[1])
    expect(mockOnClose).toHaveBeenCalled()
  })
}) 