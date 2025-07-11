import React, { useRef, useState, useEffect } from 'react'

export type SecondaryActionType = 'LINKEDIN' | 'PHONE_CALL' | 'CONFERENCE'

const actions: { type: SecondaryActionType; label: string; icon: string }[] = [
  { type: 'LINKEDIN', label: 'LinkedIn', icon: '🔗' },
  { type: 'PHONE_CALL', label: 'Phone Call', icon: '📞' },
  { type: 'CONFERENCE', label: 'Conference', icon: '🎤' },
]

interface ActionMenuProps {
  onAction: (type: SecondaryActionType) => void
  contactName?: string
}

export function ActionMenu({ onAction, contactName }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [selectedAction, setSelectedAction] = useState<SecondaryActionType | null>(null)
  const [note, setNote] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [editingContact, setEditingContact] = useState(false)
  const [editedContactName, setEditedContactName] = useState(contactName || '')

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  // Close modal on outside click
  useEffect(() => {
    if (!selectedAction) return
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setSelectedAction(null)
        setNote('')
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedAction(null)
        setNote('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [selectedAction])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]')
    if (!menuItems) return
    menuItems[focusedIndex]?.focus()
  }, [open, focusedIndex])

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setOpen(true)
      setFocusedIndex(0)
    }
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((idx + 1) % actions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((idx - 1 + actions.length) % actions.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleActionSelect(actions[idx].type)
    }
  }

  const handleActionSelect = (actionType: SecondaryActionType) => {
    setSelectedAction(actionType)
    setOpen(false)
  }

  const handleSubmit = () => {
    if (selectedAction) {
      onAction(selectedAction)
      setSelectedAction(null)
      setNote('')
    }
  }

  const handleContactEdit = () => {
    setEditingContact(true)
  }

  const handleContactEditSave = () => {
    setEditingContact(false)
    // Update the displayed contact name
    // In a real app, this would also update the backend
  }

  const handleContactEditCancel = () => {
    setEditingContact(false)
    setEditedContactName(contactName || '')
  }

  return (
    <>
      <div style={{ display: 'inline-block', position: 'relative' }}>
        <button
          ref={buttonRef}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More actions"
          type="button"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleButtonKeyDown}
          style={{ padding: '0.5rem', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.5rem' }}
        >
          &#x22EE;
        </button>
        {open && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Secondary actions"
            tabIndex={-1}
            style={{
              position: 'absolute',
              right: 0,
              zIndex: 10,
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              minWidth: '180px',
              marginTop: '0.5rem',
              outline: 'none',
            }}
          >
            {actions.map((action, idx) => (
              <button
                key={action.type}
                role="menuitem"
                tabIndex={0}
                aria-label={action.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onClick={() => handleActionSelect(action.type)}
                onKeyDown={(e) => handleMenuKeyDown(e, idx)}
              >
                <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedAction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-label={`${actions.find(a => a.type === selectedAction)?.label} Action`}
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>
              {actions.find(a => a.type === selectedAction)?.label} Action
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="contact-name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Contact
              </label>
              {editingContact ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    id="contact-name"
                    aria-label="Edit contact name"
                    type="text"
                    value={editedContactName}
                    onChange={e => setEditedContactName(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleContactEditSave}
                    aria-label="Save contact"
                    style={{ padding: '0.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                  >
                    Save Contact
                  </button>
                  <button
                    type="button"
                    onClick={handleContactEditCancel}
                    aria-label="Cancel edit"
                    style={{ padding: '0.5rem', background: 'white', color: '#333', border: '1px solid #ddd', borderRadius: '0.25rem', cursor: 'pointer' }}
                  >
                    Cancel Edit
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleContactEdit}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  {editedContactName || 'No contact selected'}
                </button>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="note" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Note
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this action..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.25rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSelectedAction(null)
                  setNote('')
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  background: 'white',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: '#007bff',
                  color: 'white',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 