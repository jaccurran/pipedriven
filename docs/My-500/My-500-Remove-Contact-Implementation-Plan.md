# My-500 Remove Contact as Active - Implementation Plan

## Overview

This document outlines the implementation plan for adding a "Remove Contact as Active" action to My-500 contact cards. This functionality will allow users to mark contacts as inactive by updating the "Still Active?" custom field in Pipedrive and optionally removing them from the local system.

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [Component Updates](#component-updates)
6. [Pipedrive Integration](#pipedrive-integration)
7. [Testing Strategy](#testing-strategy)
8. [Implementation Phases](#implementation-phases)
9. [Risk Assessment](#risk-assessment)

## Functional Requirements

### Core Features

#### 1. Remove Contact Action
- **Location**: Secondary actions menu (ellipsis menu) on contact cards
- **Label**: "Remove as Active"
- **Icon**: Archive/Inactive icon (📁 or 🚫)
- **Confirmation**: Modal dialog with confirmation before proceeding

#### 2. Pipedrive Integration
- **Primary Action**: Update "Still Active?" custom field to "Not Active"
- **Secondary Action**: Optionally remove from "Persons Still Active - Pipedriver" filter
- **Fallback**: If custom field not found, create activity note about deactivation

#### 3. Local System Behavior
- **Option 1**: Remove contact from My-500 view (hide from active contacts)
- **Option 2**: Keep in system but mark as inactive (add inactive status)
- **Option 3**: Move to separate "Inactive Contacts" section

#### 4. User Experience
- **Confirmation Dialog**: Clear explanation of what will happen
- **Success Feedback**: Toast notification confirming action
- **Error Handling**: Clear error messages if Pipedrive update fails
- **Undo Option**: Ability to reactivate contact within 24 hours

### Business Rules

#### 1. Permission Requirements
- User must have valid Pipedrive API key
- User must own the contact (RBAC validation)
- Contact must be currently active

#### 2. Validation Rules
- Cannot deactivate contact with pending activities (future due dates)
- Cannot deactivate contact that's already inactive
- Must provide reason for deactivation (optional but recommended)

#### 3. Data Integrity
- Maintain audit trail of deactivation
- Preserve contact data for potential reactivation
- Sync status with Pipedrive when possible

## Technical Architecture

### 1. Backend Services

#### ContactService Enhancement
```typescript
// Already implemented in ContactService
async deactivateContact(
  contactId: string, 
  userId: string, 
  options: DeactivateOptions = {}
): Promise<DeactivateResult>

async reactivateContact(
  contactId: string, 
  userId: string, 
  options: ReactivateOptions = {}
): Promise<ReactivateResult>
```

#### PipedriveService Enhancement
```typescript
// Already implemented in PipedriveService
async deactivateContact(personId: number): Promise<{ success: boolean; error?: string }>
async reactivateContact(personId: number): Promise<{ success: boolean; error?: string }>
```

### 2. API Endpoints

#### New API Routes
```typescript
// POST /api/contacts/[id]/deactivate
// POST /api/contacts/[id]/reactivate
```

### 3. Frontend Components

#### ActionMenu Enhancement
```typescript
// Add new action type
export type SecondaryActionType = 'LINKEDIN' | 'PHONE_CALL' | 'CONFERENCE' | 'REMOVE_AS_ACTIVE'
```

#### Confirmation Modal
```typescript
// New component for deactivation confirmation
interface DeactivateConfirmationModalProps {
  contact: ContactWithActivities
  isOpen: boolean
  onConfirm: (options: DeactivateOptions) => Promise<void>
  onCancel: () => void
}
```

## Database Schema

### Current Schema (Already Implemented)
```prisma
model Contact {
  // ... existing fields
  
  // Deactivation fields (already present)
  isActive             Boolean       @default(true)
  deactivatedAt        DateTime?
  deactivatedBy        String?
  deactivationReason   String?
  
  // ... rest of fields
}

model Activity {
  // ... existing fields
  
  // System activity fields (already present)
  isSystemActivity     Boolean      @default(false)
  systemAction         String?
  
  // ... rest of fields
}
```

## API Design

### 1. Deactivate Contact Endpoint

#### Request
```typescript
POST /api/contacts/[id]/deactivate
Content-Type: application/json

{
  "reason": "No longer interested in our services",
  "removeFromSystem": false,
  "syncToPipedrive": true
}
```

#### Response
```typescript
{
  "success": true,
  "data": {
    "contactId": "contact-123",
    "pipedriveUpdated": true,
    "localUpdated": true,
    "activityId": "activity-456"
  }
}
```

### 2. Reactivate Contact Endpoint

#### Request
```typescript
POST /api/contacts/[id]/reactivate
Content-Type: application/json

{
  "reason": "Contact re-engaged",
  "syncToPipedrive": true
}
```

#### Response
```typescript
{
  "success": true,
  "data": {
    "contactId": "contact-123",
    "pipedriveUpdated": true,
    "localUpdated": true,
    "activityId": "activity-789"
  }
}
```

## Component Updates

### 1. ActionMenu Component

#### Add New Action Type
```typescript
const actions: { type: SecondaryActionType; label: string; icon: string }[] = [
  { type: 'LINKEDIN', label: 'LinkedIn', icon: '🔗' },
  { type: 'PHONE_CALL', label: 'Phone Call', icon: '📞' },
  { type: 'CONFERENCE', label: 'Conference', icon: '🎤' },
  { type: 'REMOVE_AS_ACTIVE', label: 'Remove as Active', icon: '🚫' },
]
```

### 2. DeactivateConfirmationModal Component

#### New Component
```typescript
interface DeactivateConfirmationModalProps {
  contact: ContactWithActivities
  isOpen: boolean
  onConfirm: (options: DeactivateOptions) => Promise<void>
  onCancel: () => void
}

export function DeactivateConfirmationModal({
  contact,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false
}: DeactivateConfirmationModalProps) {
  const [reason, setReason] = useState('')
  const [removeFromSystem, setRemoveFromSystem] = useState(false)
  const [syncToPipedrive, setSyncToPipedrive] = useState(true)

  const handleConfirm = async () => {
    await onConfirm({
      reason: reason || 'Removed by user via My-500',
      removeFromSystem,
      syncToPipedrive
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          Remove {contact.name} as Active?
        </h2>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-4">
            This will mark {contact.name} as inactive and update their status in Pipedrive.
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you removing this contact as active?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="syncToPipedrive"
                checked={syncToPipedrive}
                onChange={(e) => setSyncToPipedrive(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="syncToPipedrive" className="text-sm">
                Update Pipedrive status
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="removeFromSystem"
                checked={removeFromSystem}
                onChange={(e) => setRemoveFromSystem(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="removeFromSystem" className="text-sm">
                Remove from system entirely
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Removing...' : 'Remove as Active'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

### 3. My500Client Component Updates

#### Add Deactivation Handler
```typescript
const handleDeactivateContact = async (contact: ContactWithActivities, options: DeactivateOptions) => {
  try {
    const response = await fetch(`/api/contacts/${contact.id}/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to deactivate contact')
    }

    const result = await response.json()
    
    if (result.success) {
      // Show success message
      setSuccessMessage(`${contact.name} has been removed as active`)
      setShowSuccessMessage(true)
      
      // Refresh contacts list
      await refetch()
    } else {
      throw new Error(result.error || 'Failed to deactivate contact')
    }
  } catch (error) {
    console.error('Failed to deactivate contact:', error)
    // Show error message
    setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Failed to deactivate contact'}`)
    setShowSuccessMessage(true)
  }
}
```

## Pipedrive Integration

### 1. Custom Field Mapping

#### Enhanced discoverCustomFieldMappings Method
```typescript
async discoverCustomFieldMappings(): Promise<{ success: boolean; mappings?: PipedriveCustomFieldMapping; error?: string }> {
  try {
    const customFieldsResult = await this.getPersonCustomFields()
    
    if (!customFieldsResult.success || !customFieldsResult.fields) {
      return {
        success: false,
        error: 'Failed to fetch custom fields'
      }
    }

    const fields = customFieldsResult.fields as PipedriveCustomField[]
    const mappings: PipedriveCustomFieldMapping = {}

    // Find "Still Active?" field
    const stillActiveField = fields.find(field => 
      field.name && (
        field.name === 'Still Active?' ||
        field.name.toLowerCase().includes('still active') ||
        field.name.toLowerCase().includes('active') ||
        field.name.toLowerCase().includes('status')
      )
    )

    if (stillActiveField) {
      mappings.stillActiveFieldKey = stillActiveField.key
      
      // Find the "Active" option
      if (stillActiveField.options && Array.isArray(stillActiveField.options)) {
        const activeOption = stillActiveField.options.find(option => 
          option.label && option.label.toLowerCase().includes('active')
        )
        if (activeOption) {
          mappings.activeValue = activeOption.value || activeOption.label
        }
      }
    }

    // ... existing field mappings

    return {
      success: true,
      mappings
    }
  } catch (error) {
    console.error('Error discovering custom field mappings:', error)
    return {
      success: false,
      error: 'Failed to discover custom field mappings'
    }
  }
}
```

### 2. Deactivate Contact Method

#### Enhanced deactivateContact Method
```typescript
async deactivateContact(personId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get custom field mappings
    const mappings = await this.discoverCustomFieldMappings()
    
    if (!mappings.stillActiveFieldKey) {
      return {
        success: false,
        error: 'Still Active custom field not found in Pipedrive'
      }
    }

    // 2. Find the "Not Active" option value
    const customFieldsResult = await this.getPersonCustomFields()
    if (!customFieldsResult.success || !customFieldsResult.fields) {
      return {
        success: false,
        error: 'Failed to fetch custom fields from Pipedrive'
      }
    }

    const stillActiveField = customFieldsResult.fields.find(
      field => field.key === mappings.stillActiveFieldKey
    )

    if (!stillActiveField?.options) {
      return {
        success: false,
        error: 'Still Active field has no options defined'
      }
    }

    const notActiveOption = stillActiveField.options.find(
      option => option.label.toLowerCase().includes('not active') ||
                option.label.toLowerCase().includes('inactive')
    )

    if (!notActiveOption) {
      return {
        success: false,
        error: 'Not Active option not found in Still Active field'
      }
    }

    // 3. Update the person's custom field
    const updateData = {
      [mappings.stillActiveFieldKey]: notActiveOption.value
    }

    const result = await this.makeApiRequest(`/persons/${personId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }, {
      endpoint: `/persons/${personId}`,
      method: 'PUT'
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to update contact in Pipedrive'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deactivating contact in Pipedrive:', error)
    return {
      success: false,
      error: 'Failed to deactivate contact in Pipedrive'
    }
  }
}
```

## Testing Strategy

### 1. Unit Tests (TDD Approach)

#### ContactService Tests
```typescript
// src/__tests__/server/services/contactService.test.ts
describe('deactivateContact', () => {
  it('should successfully deactivate a contact', async () => {
    // Arrange
    const mockContact = createMockContact({ isActive: true, pipedrivePersonId: '123' })
    const mockUser = createMockUser({ id: 'user-1' })
    
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
    vi.mocked(prisma.contact.update).mockResolvedValue({ ...mockContact, isActive: false })
    vi.mocked(prisma.activity.create).mockResolvedValue(createMockActivity())
    vi.mocked(createPipedriveService).mockResolvedValue({
      deactivateContact: vi.fn().mockResolvedValue({ success: true })
    } as any)

    // Act
    const result = await contactService.deactivateContact('contact-1', 'user-1', {
      reason: 'No longer interested',
      syncToPipedrive: true
    })

    // Assert
    expect(result.success).toBe(true)
    expect(result.data?.contactId).toBe('contact-1')
    expect(result.data?.pipedriveUpdated).toBe(true)
    expect(result.data?.localUpdated).toBe(true)
    expect(result.data?.activityId).toBeDefined()
  })

  it('should fail when contact not found', async () => {
    // Arrange
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null)

    // Act
    const result = await contactService.deactivateContact('contact-1', 'user-1')

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Contact not found')
  })

  it('should fail when contact is already inactive', async () => {
    // Arrange
    const mockContact = createMockContact({ isActive: false })
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)

    // Act
    const result = await contactService.deactivateContact('contact-1', 'user-1')

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Contact is already inactive')
  })

  it('should fail when contact has pending activities', async () => {
    // Arrange
    const mockContact = createMockContact({ isActive: true })
    const mockActivities = [createMockActivity({ dueDate: new Date(Date.now() + 86400000) })]
    
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(mockContact)
    vi.mocked(prisma.activity.findMany).mockResolvedValue(mockActivities)

    // Act
    const result = await contactService.deactivateContact('contact-1', 'user-1')

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot deactivate contact with pending activities')
  })
})
```

#### PipedriveService Tests
```typescript
// src/__tests__/server/services/pipedriveService.test.ts
describe('deactivateContact', () => {
  it('should successfully deactivate contact in Pipedrive', async () => {
    // Arrange
    const mockMappings = { stillActiveFieldKey: 'still_active_field' }
    const mockCustomFields = [
      {
        key: 'still_active_field',
        name: 'Still Active?',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Not Active', value: 'not_active' }
        ]
      }
    ]
    
    vi.mocked(pipedriveService.discoverCustomFieldMappings).mockResolvedValue({
      success: true,
      mappings: mockMappings
    })
    vi.mocked(pipedriveService.getPersonCustomFields).mockResolvedValue({
      success: true,
      fields: mockCustomFields
    })
    vi.mocked(pipedriveService.makeApiRequest).mockResolvedValue({
      success: true,
      data: { data: { id: 123 } }
    })

    // Act
    const result = await pipedriveService.deactivateContact(123)

    // Assert
    expect(result.success).toBe(true)
  })

  it('should fail when custom field not found', async () => {
    // Arrange
    vi.mocked(pipedriveService.discoverCustomFieldMappings).mockResolvedValue({
      success: true,
      mappings: {}
    })

    // Act
    const result = await pipedriveService.deactivateContact(123)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Still Active custom field not found in Pipedrive')
  })

  it('should fail when Not Active option not found', async () => {
    // Arrange
    const mockMappings = { stillActiveFieldKey: 'still_active_field' }
    const mockCustomFields = [
      {
        key: 'still_active_field',
        name: 'Still Active?',
        options: [
          { label: 'Active', value: 'active' }
        ]
      }
    ]
    
    vi.mocked(pipedriveService.discoverCustomFieldMappings).mockResolvedValue({
      success: true,
      mappings: mockMappings
    })
    vi.mocked(pipedriveService.getPersonCustomFields).mockResolvedValue({
      success: true,
      fields: mockCustomFields
    })

    // Act
    const result = await pipedriveService.deactivateContact(123)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not Active option not found in Still Active field')
  })
})
```

#### 2. Integration Tests (Middle Layer)

##### API Route Tests
```typescript
// src/__tests__/app/api/contacts/[id]/deactivate/route.test.ts
describe('POST /api/contacts/[id]/deactivate', () => {
  it('should successfully deactivate a contact', async () => {
    // Arrange
    const mockContact = createMockContact({ isActive: true, pipedrivePersonId: '123' })
    const mockUser = createMockUser({ id: 'user-1' })
    
    vi.mocked(getServerSession).mockResolvedValue({
      user: mockUser
    } as any)
    
    vi.mocked(ContactService.prototype.deactivateContact).mockResolvedValue({
      success: true,
      data: {
        contactId: 'contact-1',
        pipedriveUpdated: true,
        localUpdated: true,
        activityId: 'activity-1'
      }
    })

    // Act
    const response = await fetch('/api/contacts/contact-1/deactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'No longer interested',
        syncToPipedrive: true
      }),
    })

    // Assert
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.contactId).toBe('contact-1')
  })

  it('should return 401 when not authenticated', async () => {
    // Arrange
    vi.mocked(getServerSession).mockResolvedValue(null)

    // Act
    const response = await fetch('/api/contacts/contact-1/deactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    // Assert
    expect(response.status).toBe(401)
  })

  it('should return 400 when validation fails', async () => {
    // Arrange
    const mockUser = createMockUser({ id: 'user-1' })
    vi.mocked(getServerSession).mockResolvedValue({
      user: mockUser
    } as any)

    // Act
    const response = await fetch('/api/contacts/contact-1/deactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeFromSystem: 'invalid' // Should be boolean
      }),
    })

    // Assert
    expect(response.status).toBe(400)
  })
})
```

#### 3. Component Tests

##### ActionMenu Tests
```typescript
// src/__tests__/components/actions/ActionMenu.test.tsx
describe('ActionMenu', () => {
  it('should include Remove as Active action', () => {
    // Arrange
    const onAction = vi.fn()
    
    // Act
    render(<ActionMenu onAction={onAction} contactName="John Doe" />)
    
    // Open menu
    const menuButton = screen.getByLabelText('More actions')
    fireEvent.click(menuButton)
    
    // Assert
    expect(screen.getByText('Remove as Active')).toBeInTheDocument()
  })

  it('should call onAction with REMOVE_AS_ACTIVE when selected', () => {
    // Arrange
    const onAction = vi.fn()
    
    // Act
    render(<ActionMenu onAction={onAction} contactName="John Doe" />)
    
    // Open menu and select action
    const menuButton = screen.getByLabelText('More actions')
    fireEvent.click(menuButton)
    
    const removeAction = screen.getByText('Remove as Active')
    fireEvent.click(removeAction)
    
    // Assert
    expect(onAction).toHaveBeenCalledWith('REMOVE_AS_ACTIVE')
  })
})
```

##### DeactivateConfirmationModal Tests
```typescript
// src/__tests__/components/contacts/DeactivateConfirmationModal.test.tsx
describe('DeactivateConfirmationModal', () => {
  it('should render contact name in title', () => {
    // Arrange
    const mockContact = createMockContact({ name: 'John Doe' })
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    // Act
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    // Assert
    expect(screen.getByText('Remove John Doe as Active?')).toBeInTheDocument()
  })

  it('should call onConfirm with correct options when confirmed', async () => {
    // Arrange
    const mockContact = createMockContact({ name: 'John Doe' })
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    // Act
    render(
      <DeactivateConfirmationModal
        contact={mockContact}
        isOpen={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    // Fill in reason
    const reasonInput = screen.getByPlaceholderText('Why are you removing this contact as active?')
    fireEvent.change(reasonInput, { target: { value: 'No longer interested' } })
    
    // Check sync to Pipedrive
    const syncCheckbox = screen.getByLabelText('Update Pipedrive status')
    fireEvent.click(syncCheckbox)
    
    // Confirm
    const confirmButton = screen.getByText('Remove as Active')
    fireEvent.click(confirmButton)
    
    // Assert
    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'No longer interested',
      removeFromSystem: false,
      syncToPipedrive: false // Should be false since we unchecked it
    })
  })
})
```

#### 4. End-to-End Tests

##### User Journey Test
```typescript
// src/e2e/remove-contact-as-active.spec.ts
describe('Remove Contact as Active', () => {
  it('should allow user to remove contact as active', async () => {
    // Arrange
    await page.goto('/my-500')
    
    // Wait for contacts to load
    await page.waitForSelector('[data-testid="contact-card"]')
    
    // Find first contact
    const firstContact = await page.$('[data-testid="contact-card"]')
    expect(firstContact).toBeTruthy()
    
    // Act
    // Open action menu
    const actionMenuButton = await firstContact.$('[aria-label="More actions"]')
    await actionMenuButton.click()
    
    // Click "Remove as Active"
    const removeAction = await page.$('text=Remove as Active')
    await removeAction.click()
    
    // Fill confirmation modal
    await page.fill('[placeholder="Why are you removing this contact as active?"]', 'No longer interested')
    
    // Confirm
    await page.click('text=Remove as Active')
    
    // Assert
    // Should show success message
    await page.waitForSelector('text=has been removed as active')
    
    // Contact should no longer be visible (if removed from system)
    // or should show as inactive (if kept in system)
  })
})
```

## Implementation Phases

### Phase 1: Backend Implementation (Week 1)

#### Day 1-2: API Endpoints
- [ ] Create `/api/contacts/[id]/deactivate` endpoint
- [ ] Create `/api/contacts/[id]/reactivate` endpoint
- [ ] Add validation schemas
- [ ] Add error handling

#### Day 3-4: Service Layer
- [ ] Verify ContactService methods work correctly
- [ ] Verify PipedriveService methods work correctly
- [ ] Add comprehensive error handling
- [ ] Add logging and monitoring

#### Day 5: Testing
- [ ] Write unit tests for API endpoints
- [ ] Write unit tests for service methods
- [ ] Write integration tests
- [ ] Test error scenarios

### Phase 2: Frontend Implementation (Week 2)

#### Day 1-2: Component Updates
- [ ] Update ActionMenu to include "Remove as Active" action
- [ ] Create DeactivateConfirmationModal component
- [ ] Add action type definitions

#### Day 3-4: Integration
- [ ] Update My500Client to handle deactivation
- [ ] Add success/error feedback
- [ ] Add loading states
- [ ] Test user interactions

#### Day 5: Testing
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Test user flows
- [ ] Accessibility testing

### Phase 3: Pipedrive Integration (Week 3)

#### Day 1-2: Custom Fields
- [ ] Test custom field discovery
- [ ] Verify field mappings work correctly
- [ ] Add fallback handling

#### Day 3-4: Sync Testing
- [ ] Test Pipedrive API calls
- [ ] Test error scenarios
- [ ] Test offline scenarios
- [ ] Performance testing

#### Day 5: Documentation
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Create troubleshooting guide

### Phase 4: Final Testing & Deployment (Week 4)

#### Day 1-2: End-to-End Testing
- [ ] Complete user journey tests
- [ ] Test with real Pipedrive data
- [ ] Performance testing
- [ ] Security testing

#### Day 3-4: Bug Fixes
- [ ] Fix any issues found
- [ ] Optimize performance
- [ ] Improve error messages
- [ ] Add monitoring

#### Day 5: Deployment
- [ ] Deploy to staging
- [ ] Final testing
- [ ] Deploy to production
- [ ] Monitor for issues

## Risk Assessment

### High Risk
- **Pipedrive API Changes**: Custom field structure might change
- **Data Loss**: Accidental deletion of contacts
- **Sync Failures**: Network issues causing inconsistent state

### Medium Risk
- **Performance Impact**: Large contact lists with deactivation
- **User Experience**: Confusing confirmation dialogs
- **Error Handling**: Unclear error messages

### Low Risk
- **UI/UX Issues**: Minor styling or interaction problems
- **Testing Coverage**: Missing edge cases

### Mitigation Strategies

#### 1. Data Safety
- Implement soft delete by default
- Add confirmation dialogs
- Provide undo functionality
- Maintain audit trail

#### 2. Pipedrive Integration
- Add comprehensive error handling
- Implement retry logic
- Add fallback mechanisms
- Monitor API rate limits

#### 3. User Experience
- Clear, descriptive confirmation dialogs
- Progress indicators for long operations
- Helpful error messages
- Success feedback

#### 4. Testing
- Comprehensive test coverage
- Real-world scenario testing
- Performance testing
- Security testing

## Success Criteria

### Functional Requirements
- [ ] Users can remove contacts as active from My-500
- [ ] Pipedrive integration works correctly
- [ ] Confirmation dialogs are clear and helpful
- [ ] Error handling is robust

### Performance Requirements
- [ ] Deactivation completes within 5 seconds
- [ ] No impact on contact list loading
- [ ] Smooth user interactions

### Quality Requirements
- [ ] 90%+ test coverage
- [ ] No critical bugs
- [ ] Accessibility compliant
- [ ] Mobile responsive

### Business Requirements
- [ ] Maintains data integrity
- [ ] Provides audit trail
- [ ] Supports business processes
- [ ] User adoption > 80% 