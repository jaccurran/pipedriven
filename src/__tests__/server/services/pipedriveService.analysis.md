# PipedriveService Analysis

## Pre-Testing Analysis
Following the testing strategy: "Analyze First, Code Second"

## Service Dependencies

### Imports
```typescript
import { PrismaClient } from '@prisma/client'
import { pipedriveConfig } from '@/lib/pipedrive-config'
```

### Methods Called
```typescript
// Prisma operations
prisma.contact.update()
prisma.user.findUnique()

// Global fetch
global.fetch()

// Configuration
pipedriveConfig.enableDataSanitization
pipedriveConfig.maxNameLength
pipedriveConfig.maxEmailLength
pipedriveConfig.maxPhoneLength
pipedriveConfig.maxOrgNameLength
pipedriveConfig.maxSubjectLength
pipedriveConfig.maxNoteLength
pipedriveConfig.apiTimeout
pipedriveConfig.maxRetries
pipedriveConfig.retryDelay
```

### Data Structures
```typescript
// Contact structure
contact.id
contact.name
contact.email
contact.phone
contact.organisation
contact.pipedrivePersonId
contact.pipedriveOrgId
contact.userId

// User structure
user.id
user.pipedriveApiKey

// Activity structure
activity.id
activity.type
activity.subject
activity.note
activity.dueDate
activity.contact?.pipedrivePersonId
```

## Business Rules

### 1. Contact Creation/Update Logic
- **Duplicate Prevention**: If `contact.pipedrivePersonId` exists, use PUT to update; otherwise use POST to create
- **Transaction Safety**: Only update database after successful API call
- **Data Sanitization**: Sanitize all data before sending to Pipedrive (if enabled)

### 2. Error Handling
- **Network Errors**: Return `success: false` with error message
- **API Errors**: Return `success: false` with API error message
- **Validation Errors**: Return `success: false` with validation details
- **Database Errors**: Log error and return `success: false`

### 3. Retry Logic
- **Retry on Network Errors**: Up to `maxRetries` times with exponential backoff
- **No Retry on API Errors**: 4xx errors are not retried
- **Retry on Server Errors**: 5xx errors are retried

### 4. Data Validation
- **Required Fields**: name, email
- **Optional Fields**: phone, organisation
- **Field Length Limits**: Configurable via pipedriveConfig
- **Data Types**: Strings for text, arrays for email/phone

### 5. API Rate Limiting
- **Respect Retry-After Header**: Wait specified time before retry
- **Exponential Backoff**: Increase delay between retries
- **Maximum Retries**: Stop after maxRetries attempts

## Test Data Requirements

### Complete Contact Data
```typescript
{
  id: 'contact-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  organisation: 'Test Corp',
  warmnessScore: 5,
  lastContacted: new Date(),
  addedToCampaign: false,
  pipedrivePersonId: null, // or existing ID for updates
  pipedriveOrgId: null,
  userId: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### Complete User Data
```typescript
{
  id: 'user-123',
  email: 'test@example.com',
  pipedriveApiKey: 'valid-api-key',
  // ... other user fields
}
```

### Complete Activity Data
```typescript
{
  id: 'activity-123',
  type: 'CALL',
  subject: 'Follow up call',
  note: 'Call to discuss partnership',
  dueDate: new Date('2025-12-25T19:00:00.000Z'), // Future date
  completed: false,
  contactId: 'contact-123',
  userId: 'user-123',
  // ... other activity fields
}
```

## Mock Strategy

### 1. Prisma Mocks
```typescript
// Mock exact method names used
prisma.contact.update.mockResolvedValue(updatedContact)
prisma.user.findUnique.mockResolvedValue(user)
```

### 2. Fetch Mocks
```typescript
// Mock global fetch with realistic responses
global.fetch = vi.fn()
vi.mocked(fetch).mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ data: { id: 123 } })
})
```

### 3. Configuration Mocks
```typescript
// Mock configuration values
vi.mock('@/lib/pipedrive-config', () => ({
  pipedriveConfig: {
    enableDataSanitization: true,
    maxNameLength: 100,
    // ... other config values
  }
}))
```

## Test Scenarios

### 1. Success Scenarios
- Create new contact (POST request)
- Update existing contact (PUT request)
- Create activity
- Fetch persons/organizations

### 2. Error Scenarios
- Network timeouts
- API rate limiting (429)
- Unauthorized (401)
- Validation errors (422)
- Server errors (5xx)
- Database connection failures

### 3. Edge Cases
- Malformed API responses
- Missing required fields
- Data sanitization limits
- Concurrent API calls
- Retry logic behavior

## Validation Points

### 1. API Call Verification
- Correct HTTP method (POST vs PUT)
- Correct URL structure
- Proper request headers
- Valid request body

### 2. Database Update Verification
- Only update after successful API call
- Correct field updates
- Error handling on database failures

### 3. Error Response Verification
- Correct error messages
- Proper logging
- Appropriate retry behavior

### 4. Data Sanitization Verification
- Field length limits applied
- Invalid characters removed
- Required fields validated 