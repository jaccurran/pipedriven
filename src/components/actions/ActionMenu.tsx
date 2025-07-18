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
    const focusedItem = menuItems[focusedIndex] as HTMLElement
    focusedItem?.focus()
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
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More actions"
          type="button"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleButtonKeyDown}
          className="p-3 sm:p-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer text-2xl sm:text-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
        >
          &#x22EE;
        </button>
        {open && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Secondary actions"
            tabIndex={-1}
            className="absolute right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] sm:min-w-[180px] mt-2 outline-none"
          >
            {actions.map((action, idx) => (
              <button
                key={action.type}
                role="menuitem"
                tabIndex={0}
                aria-label={action.label}
                className="flex items-center w-full px-4 py-3 sm:px-3 sm:py-2 bg-none border-none text-left text-sm sm:text-base cursor-pointer outline-none hover:bg-gray-50 focus:bg-gray-50 transition-colors duration-150 min-h-[44px] sm:min-h-[36px]"
                onClick={() => handleActionSelect(action.type)}
                onKeyDown={(e) => handleMenuKeyDown(e, idx)}
              >
                <span className="mr-3 sm:mr-2 text-xl sm:text-lg">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-label={`${actions.find(a => a.type === selectedAction)?.label} Action`}
            className="bg-white p-6 sm:p-4 rounded-lg min-w-[320px] sm:min-w-[400px] max-w-[500px] w-full max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">
              {actions.find(a => a.type === selectedAction)?.label} Action
            </h2>
            
            <div className="mb-4 sm:mb-3">
              <label htmlFor="contact-name" className="block mb-2 font-medium text-sm">
                Contact
              </label>
              {editingContact ? (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-center">
                  <input
                    id="contact-name"
                    aria-label="Edit contact name"
                    type="text"
                    value={editedContactName}
                    onChange={e => setEditedContactName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleContactEditSave}
                    aria-label="Save contact"
                    className="px-4 py-2 bg-blue-600 text-white border-none rounded-md cursor-pointer text-sm hover:bg-blue-700 transition-colors duration-200 min-h-[44px] sm:min-h-[36px]"
                  >
                    Save Contact
                  </button>
                  <button
                    type="button"
                    onClick={handleContactEditCancel}
                    aria-label="Cancel edit"
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md cursor-pointer text-sm hover:bg-gray-50 transition-colors duration-200 min-h-[44px] sm:min-h-[36px]"
                  >
                    Cancel Edit
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleContactEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer text-left text-sm hover:bg-gray-50 transition-colors duration-200 min-h-[44px] sm:min-h-[36px]"
                >
                  {editedContactName || 'No contact selected'}
                </button>
              )}
            </div>

            <div className="mb-6 sm:mb-4">
              <label htmlFor="note" className="block mb-2 font-medium text-sm">
                Note
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this action..."
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md resize-vertical text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-end">
              <button
                onClick={() => {
                  setSelectedAction(null)
                  setNote('')
                }}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md cursor-pointer text-sm hover:bg-gray-50 transition-colors duration-200 min-h-[44px] sm:min-h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 border-none bg-blue-600 text-white rounded-md cursor-pointer text-sm hover:bg-blue-700 transition-colors duration-200 min-h-[44px] sm:min-h-[36px]"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 