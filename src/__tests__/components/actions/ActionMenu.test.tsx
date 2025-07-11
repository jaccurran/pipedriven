import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ActionMenu } from '@/components/actions/ActionMenu'

const secondaryActions = [
  { type: 'LINKEDIN', label: 'LinkedIn' },
  { type: 'PHONE_CALL', label: 'Phone Call' },
  { type: 'CONFERENCE', label: 'Conference' },
]

describe('ActionMenu', () => {
  const mockOnAction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
  })

  it('renders ellipsis button', () => {
    render(<ActionMenu onAction={mockOnAction} />)
    const button = screen.getByRole('button', { name: /more actions/i })
    expect(button).toBeInTheDocument()
  })

  it('opens menu on button click', () => {
    render(<ActionMenu onAction={mockOnAction} />)
    const button = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(button)
    secondaryActions.forEach(action => {
      expect(screen.getByRole('menuitem', { name: action.label })).toBeInTheDocument()
    })
  })



  it('closes menu on outside click', () => {
    render(<div><ActionMenu onAction={mockOnAction} /><button>Outside</button></div>)
    const button = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(button)
    expect(screen.getByRole('menuitem', { name: /LinkedIn/i })).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByText('Outside'))
    expect(screen.queryByRole('menuitem', { name: /LinkedIn/i })).not.toBeInTheDocument()
  })

  it('closes menu on Escape key', () => {
    render(<ActionMenu onAction={mockOnAction} />)
    const button = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(button)
    expect(screen.getByRole('menuitem', { name: /LinkedIn/i })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: /LinkedIn/i })).not.toBeInTheDocument()
  })

  it('opens modal on menu item click and closes menu', () => {
    render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
    const button = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(button)
    const menuItem = screen.getByRole('menuitem', { name: /LinkedIn/i })
    fireEvent.click(menuItem)
    // Modal should open
    expect(screen.getByRole('dialog', { name: /LinkedIn Action/i })).toBeInTheDocument()
    // Menu should close
    expect(screen.queryByRole('menuitem', { name: /LinkedIn/i })).not.toBeInTheDocument()
    // onAction should not be called yet
    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('calls onAction when Save button is clicked in modal', () => {
    render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
    const button = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('menuitem', { name: /LinkedIn/i }))
    // Click Save button
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mockOnAction).toHaveBeenCalledWith('LINKEDIN')
    // Modal should close
    expect(screen.queryByRole('dialog', { name: /LinkedIn Action/i })).not.toBeInTheDocument()
  })

  it('is keyboard accessible (Tab, Enter, Arrow keys)', () => {
    render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
    const button = screen.getByRole('button', { name: /more actions/i })
    button.focus()
    fireEvent.keyDown(button, { key: 'Enter' })
    const menuItem = screen.getByRole('menuitem', { name: /LinkedIn/i })
    expect(menuItem).toBeInTheDocument()
    menuItem.focus()
    fireEvent.keyDown(menuItem, { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: /Phone Call/i })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /Phone Call/i }), { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: /Conference/i })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /Conference/i }), { key: 'ArrowUp' })
    expect(screen.getByRole('menuitem', { name: /Phone Call/i })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /Phone Call/i }), { key: 'Enter' })
    // Modal should open instead of immediately calling onAction
    expect(screen.getByRole('dialog', { name: /Phone Call Action/i })).toBeInTheDocument()
    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('has correct ARIA roles', () => {
    render(<ActionMenu onAction={mockOnAction} />)
    const button = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(button)
    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    secondaryActions.forEach(action => {
      expect(screen.getByRole('menuitem', { name: action.label })).toBeInTheDocument()
    })
  })

  describe('secondary action modals', () => {
    it('opens LinkedIn modal with note form and editable contact name', () => {
      render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
      const button = screen.getByRole('button', { name: /more actions/i })
      fireEvent.click(button)
      fireEvent.click(screen.getByRole('menuitem', { name: /LinkedIn/i }))
      expect(screen.getByRole('dialog', { name: /LinkedIn Action/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/note/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Jane Doe/i })).toBeInTheDocument()
    })

    it('opens Phone Call modal with note form and editable contact name', () => {
      render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
      const button = screen.getByRole('button', { name: /more actions/i })
      fireEvent.click(button)
      fireEvent.click(screen.getByRole('menuitem', { name: /Phone Call/i }))
      expect(screen.getByRole('dialog', { name: /Phone Call Action/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/note/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Jane Doe/i })).toBeInTheDocument()
    })

    it('opens Conference modal with note form and editable contact name', () => {
      render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
      const button = screen.getByRole('button', { name: /more actions/i })
      fireEvent.click(button)
      fireEvent.click(screen.getByRole('menuitem', { name: /Conference/i }))
      expect(screen.getByRole('dialog', { name: /Conference Action/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/note/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Jane Doe/i })).toBeInTheDocument()
    })
  })

  describe('contact editing in modal', () => {
    it('shows editable input when contact name is clicked', () => {
      render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
      const button = screen.getByRole('button', { name: /more actions/i })
      fireEvent.click(button)
      fireEvent.click(screen.getByRole('menuitem', { name: /LinkedIn/i }))
      const contactButton = screen.getByRole('button', { name: /Jane Doe/i })
      fireEvent.click(contactButton)
      expect(screen.getByRole('textbox', { name: /edit contact name/i })).toBeInTheDocument()
    })

    it('saves edited contact name and returns to normal state', () => {
      render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
      const button = screen.getByRole('button', { name: /more actions/i })
      fireEvent.click(button)
      fireEvent.click(screen.getByRole('menuitem', { name: /LinkedIn/i }))
      const contactButton = screen.getByRole('button', { name: /Jane Doe/i })
      fireEvent.click(contactButton)
      const input = screen.getByRole('textbox', { name: /edit contact name/i })
      fireEvent.change(input, { target: { value: 'Janet Smith' } })
      fireEvent.click(screen.getByRole('button', { name: /save contact/i }))
      expect(screen.queryByRole('textbox', { name: /edit contact name/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Janet Smith/i })).toBeInTheDocument()
    })

    it('cancels editing contact name and restores previous value', () => {
      render(<ActionMenu onAction={mockOnAction} contactName="Jane Doe" />)
      const button = screen.getByRole('button', { name: /more actions/i })
      fireEvent.click(button)
      fireEvent.click(screen.getByRole('menuitem', { name: /LinkedIn/i }))
      const contactButton = screen.getByRole('button', { name: /Jane Doe/i })
      fireEvent.click(contactButton)
      const input = screen.getByRole('textbox', { name: /edit contact name/i })
      fireEvent.change(input, { target: { value: 'Janet Smith' } })
      fireEvent.click(screen.getByRole('button', { name: /cancel edit/i }))
      expect(screen.queryByRole('textbox', { name: /edit contact name/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Jane Doe/i })).toBeInTheDocument()
    })
  })
}) 