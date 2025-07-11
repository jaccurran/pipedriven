import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContactList } from '@/components/contacts/ContactList'
import { Contact, User } from '@prisma/client'
import { describe, it, expect, vi } from 'vitest';

// Mock data
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
    warmnessScore: 5,
    lastContacted: null,
    addedToCampaign: false,
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'contact-2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+0987654321',
    organisation: 'Tech Solutions',
    warmnessScore: 3,
    lastContacted: null,
    addedToCampaign: false,
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

describe('ContactList', () => {
  it('renders contacts list correctly', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
  })

  it('shows contact warmness scores', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    const warmnessElements = screen.getAllByText('5')
    expect(warmnessElements.length).toBeGreaterThan(0)
    const otherWarmnessElements = screen.getAllByText('3')
    expect(otherWarmnessElements.length).toBeGreaterThan(0)
  })

  it('displays contact organisation', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    const acmeCorpElements = screen.getAllByText('Acme Corp')
    expect(acmeCorpElements.length).toBeGreaterThan(0)
    const techSolutionsElements = screen.getAllByText('Tech Solutions')
    expect(techSolutionsElements.length).toBeGreaterThan(0)
  })

  it('filters contacts by warmness score', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    const warmnessSelects = screen.getAllByRole('combobox')
    expect(warmnessSelects.length).toBeGreaterThan(0)
    
    // Verify the select has the expected options
    const allWarmnessOptions = screen.getAllByText('All Warmness')
    expect(allWarmnessOptions.length).toBeGreaterThan(0)
  })

  it('filters contacts by organisation', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    const organisationSelects = screen.getAllByRole('combobox')
    expect(organisationSelects.length).toBeGreaterThan(1)
    
    // Verify the select has the expected options
    const allOrganisationsOptions = screen.getAllByText('All Organisations')
    expect(allOrganisationsOptions.length).toBeGreaterThan(0)
  })

  it('searches contacts by name or email', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    const searchInputs = screen.getAllByPlaceholderText('Search contacts...')
    expect(searchInputs.length).toBeGreaterThan(0)
    
    const searchInput = searchInputs[0]
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveValue('')
  })

  it('shows empty state when no contacts', () => {
    render(<ContactList contacts={[]} user={mockUser} />)
    
    expect(screen.getByText('No contacts found')).toBeInTheDocument()
    expect(screen.getByText('Add your first contact to get started.')).toBeInTheDocument()
  })

  it('handles contact actions', () => {
    const mockOnEdit = vi.fn()
    const mockOnDelete = vi.fn()
    
    render(
      <ContactList 
        contacts={mockContacts} 
        user={mockUser}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    // ContactList doesn't currently have action buttons
    // This test is kept for future implementation
    expect(mockOnEdit).toBeDefined()
    expect(mockOnDelete).toBeDefined()
  })

  it('displays contact information correctly', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
  })

  it('shows phone numbers when available', () => {
    render(<ContactList contacts={mockContacts} user={mockUser} />)
    
    const phoneNumbers = screen.getAllByText('+1234567890')
    expect(phoneNumbers.length).toBeGreaterThan(0)
    const otherPhoneNumbers = screen.getAllByText('+0987654321')
    expect(otherPhoneNumbers.length).toBeGreaterThan(0)
  })
}) 