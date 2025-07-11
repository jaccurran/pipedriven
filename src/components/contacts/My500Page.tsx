"use client"

import React, { useState, useMemo } from 'react'
import type { Contact } from '@prisma/client'
import {
  sortContactsForMy500,
  getContactSummary,
} from '@/lib/contactSorting'

interface My500PageProps {
  contacts: Contact[]
}

export function My500Page({ contacts }: My500PageProps) {
  const [search, setSearch] = useState('')

  const filteredContacts = useMemo(() => {
    return sortContactsForMy500(
      contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (c.organisation?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    )
  }, [contacts, search])

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">My 500 Contacts</h1>
      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-6 w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      {filteredContacts.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No contacts found.</div>
      ) : (
        <ul className="space-y-4">
          {filteredContacts.map(contact => {
            const summary = getContactSummary(contact)
            return (
              <li
                key={contact.id}
                className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span data-testid="contact-name" className="font-semibold text-lg">{contact.name}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium uppercase ${summary.statusColor}`}>{summary.status}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium uppercase border ${summary.priorityColor}`}>{summary.priority}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {contact.organisation && <span>{contact.organisation} &middot; </span>}
                    {contact.email}
                  </div>
                  {summary.needsAttention && (
                    <div className="mt-2 text-xs text-red-600 font-medium" data-testid="attention-alert">
                      Needs attention
                    </div>
                  )}
                </div>
                <div className="mt-2 sm:mt-0 sm:ml-4 text-sm text-gray-400 text-right">
                  {summary.daysSinceContact !== null ? (
                    <span>{summary.daysSinceContact} days since last contact</span>
                  ) : (
                    <span>Never contacted</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
} 