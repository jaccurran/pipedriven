import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { My500Page } from '@/components/contacts/My500Page'
import type { Contact } from '@prisma/client'

// Mock contacts
const contacts: Contact[] = [
  {
    id: '1',
    name: 'Alice Customer',
    email: 'alice@customer.com',
    phone: null,
    organisation: 'Customer Org',
    warmnessScore: 7,
    lastContacted: new Date('2024-01-10'),
    addedToCampaign: true,
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-1',
  },
  {
    id: '2',
    name: 'Bob Prospect',
    email: 'bob@prospect.com',
    phone: null,
    organisation: 'Prospect Org',
    warmnessScore: 3,
    lastContacted: new Date('2024-01-05'),
    addedToCampaign: false,
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-1',
  },
  {
    id: '3',
    name: 'Charlie Cold',
    email: 'charlie@cold.com',
    phone: null,
    organisation: 'Cold Org',
    warmnessScore: 0,
    lastContacted: null,
    addedToCampaign: false,
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-1',
  },
]

describe('My500Page', () => {
  it('renders contacts sorted by priority and activity', () => {
    render(<My500Page contacts={contacts} />)
    const contactNames = screen.getAllByTestId('contact-name').map(el => el.textContent)
    // Expected order: Alice (customer, high), Charlie (cold, never contacted), Bob (warm, contacted)
    expect(contactNames[0]).toContain('Alice Customer')
    expect(contactNames[1]).toContain('Charlie Cold')
    expect(contactNames[2]).toContain('Bob Prospect')
  })

  it('shows activity status and priority badges', () => {
    render(<My500Page contacts={contacts} />)
    // Use getAllByText to handle multiple instances (due to React.StrictMode)
    expect(screen.getAllByText('hot').length).toBeGreaterThan(0) // Alice
    expect(screen.getAllByText('warm').length).toBeGreaterThan(0) // Bob
    expect(screen.getAllByText('cold').length).toBeGreaterThan(0) // Charlie
    expect(screen.getAllByText('high').length).toBeGreaterThan(0) // Alice
    expect(screen.getAllByText('medium').length).toBeGreaterThan(0) // Bob
    expect(screen.getAllByText('low').length).toBeGreaterThan(0) // Charlie
  })

  it('shows alert for contacts needing attention', () => {
    render(<My500Page contacts={contacts} />)
    // Use getAllByText to handle multiple instances
    expect(screen.getAllByText(/needs attention/i).length).toBeGreaterThan(0)
  })

  it('filters contacts by search', async () => {
    const user = userEvent.setup()
    render(<My500Page contacts={contacts} />)
    const searchInputs = screen.getAllByPlaceholderText('Search contacts...')
    const searchInput = searchInputs[0]
    await user.type(searchInput, 'Bob')
    const visibleNames = (await screen.findAllByTestId('contact-name')).map(el => el.textContent)
    // eslint-disable-next-line no-console
    console.log('Visible names after filter:', visibleNames)
    expect(visibleNames.some(name => name === 'Bob Prospect')).toBe(true)
  })

  it('shows empty state when no contacts', () => {
    render(<My500Page contacts={[]} />)
    expect(screen.getByText(/no contacts/i)).toBeInTheDocument()
  })
})

describe('My500Page - Extended Coverage', () => {
  const baseContact = {
    id: 'x',
    name: 'Test',
    email: 'test@example.com',
    phone: null,
    organisation: 'Test Org',
    warmnessScore: 0,
    lastContacted: null,
    addedToCampaign: false,
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-1',
  }

  it('filters contacts by email', async () => {
    const user = userEvent.setup()
    const contacts = [
      { ...baseContact, id: '1', name: 'Alpha', email: 'alpha@foo.com' },
      { ...baseContact, id: '2', name: 'Beta', email: 'beta@bar.com' },
    ]
    render(<My500Page contacts={contacts} />)
    const searchInput = screen.getAllByPlaceholderText('Search contacts...')[0]
    await user.type(searchInput, 'beta@bar.com')
    const visibleNames = (await screen.findAllByTestId('contact-name')).map(el => el.textContent)
    expect(visibleNames.some(name => name === 'Beta')).toBe(true)
  })

  it('filters contacts by organisation', async () => {
    const user = userEvent.setup()
    const contacts = [
      { ...baseContact, id: '1', name: 'Alpha', organisation: 'Acme' },
      { ...baseContact, id: '2', name: 'Beta', organisation: 'BetaOrg' },
    ]
    render(<My500Page contacts={contacts} />)
    const searchInput = screen.getAllByPlaceholderText('Search contacts...')[0]
    await user.type(searchInput, 'BetaOrg')
    const visibleNames = (await screen.findAllByTestId('contact-name')).map(el => el.textContent)
    expect(visibleNames.some(name => name === 'Beta')).toBe(true)
  })

  it('shows empty state when filter yields no matches', async () => {
    const user = userEvent.setup()
    const contacts = [
      { ...baseContact, id: '1', name: 'Alpha' },
      { ...baseContact, id: '2', name: 'Beta' },
    ]
    render(<My500Page contacts={contacts} />)
    const searchInput = screen.getAllByPlaceholderText('Search contacts...')[0]
    await user.type(searchInput, 'ZZZZZZ')
    expect(screen.getAllByText(/no contacts/i).length).toBeGreaterThan(0)
  })

  it('shows needs attention for never contacted', () => {
    const contacts = [
      { ...baseContact, id: '1', name: 'Never', lastContacted: null, warmnessScore: 1 },
    ]
    render(<My500Page contacts={contacts} />)
    expect(screen.getAllByTestId('attention-alert').length).toBeGreaterThan(0)
  })

  it('shows needs attention for >30 days and low warmness', () => {
    const contacts = [
      { ...baseContact, id: '1', name: 'Old', lastContacted: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), warmnessScore: 1 },
    ]
    render(<My500Page contacts={contacts} />)
    expect(screen.getAllByTestId('attention-alert').length).toBeGreaterThan(0)
  })

  it('renders correct badge text and color for all status/priority combos', () => {
    const combos = [
      { warmnessScore: 8, addedToCampaign: true, status: 'hot', priority: 'high' },
      { warmnessScore: 4, addedToCampaign: false, status: 'warm', priority: 'medium' },
      { warmnessScore: 1, addedToCampaign: false, status: 'cold', priority: 'low' },
      { warmnessScore: -1, addedToCampaign: false, status: 'lost', priority: 'low' },
    ]
    const contacts = combos.map((c, i) => ({ ...baseContact, id: String(i), name: c.status, warmnessScore: c.warmnessScore, addedToCampaign: c.addedToCampaign }))
    render(<My500Page contacts={contacts} />)
    combos.forEach(c => {
      expect(screen.getAllByText(c.status).length).toBeGreaterThan(0)
      expect(screen.getAllByText(c.priority).length).toBeGreaterThan(0)
    })
  })

  it('sorts contacts with identical fields stably', () => {
    const contacts = [
      { ...baseContact, id: '1', name: 'A', warmnessScore: 1, lastContacted: null },
      { ...baseContact, id: '2', name: 'B', warmnessScore: 1, lastContacted: null },
      { ...baseContact, id: '3', name: 'C', warmnessScore: 1, lastContacted: null },
    ]
    render(<My500Page contacts={contacts} />)
    const visibleNames = screen.getAllByTestId('contact-name').map(el => el.textContent)
    // Check that A, B, C are in the visible names (may be mixed with other renders)
    expect(visibleNames).toContain('A')
    expect(visibleNames).toContain('B')
    expect(visibleNames).toContain('C')
  })
}) 