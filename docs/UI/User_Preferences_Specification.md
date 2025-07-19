# User Preferences Screen - UI Specification

## Overview

The User Preferences screen provides users with a centralized location to manage their account settings, API configurations, and application preferences. This screen is accessible from the side menu under the ellipsis (three dots) menu and follows the mobile-first design principles of the Pipedriver application.

## Access Points

### Primary Access
- **Side Menu**: Ellipsis menu (three dots) → "Preferences"
- **User Menu**: Profile dropdown → "Preferences" (desktop)

### Secondary Access
- **Settings**: Direct navigation to `/preferences`
- **Profile**: Profile page → "Edit Preferences"

## Screen Layout

### Mobile Layout (320px - 768px)
```
┌─────────────────────────────────────┐
│ ← Back    User Preferences          │
├─────────────────────────────────────┤
│                                     │
│ ┌─ Account Settings ──────────────┐ │
│ │ • Change Password               │ │
│ │ • Role Selection                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Pipedrive Integration ─────────┐ │
│ │ • API Key Management            │ │
│ │ • Connection Status             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Application Preferences ───────┐ │
│ │ • Quick Action Default Mode     │ │
│ │ • Notification Settings         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Save Changes] [Cancel]             │
└─────────────────────────────────────┘
```

### Desktop Layout (1024px+)
```
┌─────────────────────────────────────────────────────────┐
│ ← Back    User Preferences                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Account Settings ──────────────────────────────────┐ │
│ │ • Change Password                                   │ │
│ │ • Role Selection                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ Pipedrive Integration ─────────────────────────────┐ │
│ │ • API Key Management                                │ │
│ │ • Connection Status                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ Application Preferences ───────────────────────────┐ │
│ │ • Quick Action Default Mode                         │ │
│ │ • Notification Settings                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Save Changes] [Cancel]                                 │
└─────────────────────────────────────────────────────────┘
```

## Section Details

### 1. Account Settings

#### Change Password
- **Type**: Modal/Form
- **Fields**:
  - Current Password (required)
  - New Password (required, min 8 chars)
  - Confirm New Password (required, must match)
- **Validation**:
  - Current password must be correct
  - New password must be at least 8 characters
  - Passwords must match
  - New password cannot be same as current
- **Actions**: Save, Cancel
- **Success**: Show success message, close modal

#### Role Selection
- **Type**: Radio button group
- **Options**:
  - Consultant (default)
  - Golden Ticket
- **Behavior**: 
  - Shows current role
  - Allows switching between roles
  - Requires confirmation for role changes
- **Validation**: Must select one role

### 2. Pipedrive Integration

#### API Key Management
- **Type**: Form with masked input
- **Fields**:
  - API Key (masked, shows last 4 characters)
  - Test Connection button
- **Actions**:
  - Update API Key
  - Test Connection
  - Remove API Key
- **Validation**:
  - API key must start with "api_"
  - API key must be valid format
- **Status Indicators**:
  - Connected (green checkmark)
  - Invalid (red X)
  - Testing (loading spinner)

#### Connection Status
- **Type**: Status indicator
- **States**:
  - Connected (green)
  - Disconnected (gray)
  - Error (red)
  - Testing (blue, loading)

### 3. Application Preferences

#### Quick Action Default Mode
- **Type**: Toggle switch
- **Options**:
  - Simple (default)
  - Detailed
- **Description**: "Choose the default mode for quick actions"
- **Behavior**: 
  - Shows current setting
  - Allows immediate switching
  - Applies to all new quick actions

#### Notification Settings
- **Type**: Checkbox group
- **Options**:
  - Email notifications (default: on)
  - Activity reminders (default: on)
  - Campaign updates (default: on)
  - Sync status alerts (default: on)

## Form Behavior

### Validation
- **Real-time**: Validate fields as user types
- **On Submit**: Validate all fields before submission
- **Error Display**: Show errors below each field
- **Success Feedback**: Show success messages

### Auto-save
- **Preferences**: Auto-save when changed
- **Password**: Manual save only
- **API Key**: Manual save with confirmation

### Loading States
- **Form Submission**: Disable form, show spinner
- **API Testing**: Show loading state on test button
- **Role Changes**: Show confirmation dialog

## Navigation

### Breadcrumbs
```
Dashboard > User Preferences
```

### Back Navigation
- **Mobile**: Back arrow in header
- **Desktop**: Back button or breadcrumb
- **Behavior**: Return to previous page

### Cancel/Save
- **Cancel**: Return to previous page without saving
- **Save**: Save all changes and return to previous page
- **Unsaved Changes**: Show warning if user tries to leave with unsaved changes

## Responsive Design

### Mobile Optimizations
- **Touch Targets**: Minimum 44px for all interactive elements
- **Form Layout**: Stacked fields, full-width inputs
- **Modal**: Full-screen overlay for password change
- **Keyboard**: Proper keyboard navigation and focus management

### Desktop Enhancements
- **Side-by-side**: Some sections can be side-by-side
- **Hover States**: Enhanced hover effects
- **Keyboard Shortcuts**: Save (Ctrl+S), Cancel (Esc)

## Accessibility

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio
- **Focus Indicators**: Clear focus indicators
- **Screen Reader**: Proper ARIA labels and descriptions
- **Keyboard Navigation**: Full keyboard accessibility

### Form Accessibility
- **Labels**: Proper form labels with `htmlFor`
- **Error Messages**: Associated with form fields
- **Required Fields**: Clear indication of required fields
- **Help Text**: Contextual help where needed

## Error Handling

### Validation Errors
- **Field-level**: Show errors below each field
- **Form-level**: Show summary at top of form
- **Clear on Fix**: Errors clear when user fixes the issue

### Network Errors
- **API Connection**: Show connection error message
- **Save Failures**: Show retry option
- **Timeout**: Show timeout message with retry

### Success Feedback
- **Save Success**: Show success message
- **Password Change**: Show success and close modal
- **Role Change**: Show confirmation message

## Data Flow

### State Management
- **Form State**: Local form state for unsaved changes
- **User Data**: Load from server on component mount
- **Validation State**: Track validation errors
- **Loading State**: Track loading states for different actions

### API Integration
- **Load Preferences**: GET `/api/user/preferences`
- **Update Preferences**: PUT `/api/user/preferences`
- **Change Password**: POST `/api/user/change-password`
- **Update API Key**: PUT `/api/user/pipedrive-api-key`
- **Test Connection**: POST `/api/pipedrive/test-connection`

## Security Considerations

### Password Security
- **Current Password**: Required for password changes
- **Password Strength**: Enforce minimum requirements
- **Rate Limiting**: Limit password change attempts

### API Key Security
- **Encryption**: API keys stored encrypted
- **Masking**: Display only last 4 characters
- **Validation**: Validate API key format and connection

### Role Changes
- **Authorization**: Check user permissions for role changes
- **Audit Trail**: Log role changes for security
- **Confirmation**: Require confirmation for role changes

## Performance Considerations

### Loading Performance
- **Lazy Loading**: Load sections as needed
- **Caching**: Cache user preferences
- **Optimistic Updates**: Update UI immediately, sync in background

### Form Performance
- **Debounced Validation**: Debounce real-time validation
- **Efficient Re-renders**: Minimize unnecessary re-renders
- **Memory Management**: Clean up event listeners

## Testing Strategy

### Unit Tests
- **Form Validation**: Test all validation rules
- **State Management**: Test form state changes
- **API Integration**: Test API calls and responses

### Integration Tests
- **User Flow**: Test complete user journey
- **Error Handling**: Test error scenarios
- **Accessibility**: Test with screen readers

### E2E Tests
- **Cross-browser**: Test in multiple browsers
- **Mobile Testing**: Test on mobile devices
- **Accessibility**: Test keyboard navigation

## Future Enhancements

### Planned Features
- **Two-Factor Authentication**: Add 2FA setup
- **Theme Selection**: Light/dark mode toggle
- **Language Preferences**: Multi-language support
- **Export Settings**: Export/import preferences

### Analytics
- **Usage Tracking**: Track preference changes
- **Error Monitoring**: Monitor validation errors
- **Performance Metrics**: Track load times and interactions 