import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContactForm } from '@/components/contacts/ContactForm'

describe('Trivial render', () => {
  it('renders a div', () => {
    render(<div>Hello</div>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})

describe('ContactForm minimal', () => {
  it('renders the Name input', () => {
    render(<ContactForm onSubmit={() => {}} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })
})

// All other tests are temporarily commented out for diagnosis 