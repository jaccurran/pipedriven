# Pipedrive Integration Specification

## Overview

This document specifies the implementation of two key Pipedrive integration features:

1. **Warm Lead Contact Creation**: When a contact becomes a warm lead and doesn't have a Pipedrive ID, create it in Pipedrive with associated organization
2. **Activity Replication**: When activities are added to contacts with Pipedrive IDs, replicate them in Pipedrive

## Table of Contents

1. [Feature 1: Warm Lead Contact Creation](#feature-1-warm-lead-contact-creation)
2. [Feature 2: Activity Replication](#feature-2-activity-replication)
3. [Technical Requirements](#technical-requirements)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Database Schema Updates](#database-schema-updates)
7. [API Endpoints](#api-endpoints)
8. [Testing Strategy](#testing-strategy)

## Feature 1: Warm Lead Contact Creation

### Trigger Conditions
- Contact's warmness score reaches or exceeds warm lead threshold (≥4)
- Contact does not have a `pipedrivePersonId`
- User has a valid Pipedrive API key configured

### Contact Creation Process

#### 1.1 Contact Data Mapping
```typescript
interface PipedriveContactData {
  name: string;           // Contact name
  email: string[];        // Array with single email
  phone: string[];        // Array with single phone
  org_name?: string;      // Organization name (if exists)
  label_ids?: number[];   // Warm Lead label ID
  owner_id?: number;      // Pipedrive user ID of the owner
}
```

#### 1.2 Organization Creation Process
If contact has an organization without a `pipedriveOrgId`:

```typescript
interface PipedriveOrganizationData {
  name: string;           // Organization name
  industry?: string;      // Sector/industry
  country?: string;       // Country
}
```

#### 1.3 Owner Assignment
- Use the user's email address to find their Pipedrive user ID
- Store the Pipedrive user ID in the User table for future use
- Assign the contact to this owner in Pipedrive

#### 1.4 Label Assignment
- Apply "Warm Lead" label to the contact
- Label ID should be retrieved from Pipedrive or created if it doesn't exist

### Implementation Flow
1. Check if contact meets warm lead criteria
2. Verify contact doesn't already have Pipedrive ID
3. Create organization in Pipedrive (if needed)
4. Create contact in Pipedrive with organization association
5. Update local contact with Pipedrive IDs
6. Apply Warm Lead label

## Feature 2: Activity Replication

### Trigger Conditions
- Activity is created for a contact
- Contact has a valid `pipedrivePersonId`
- User has a valid Pipedrive API key configured

### Activity Data Mapping

#### 2.1 Activity Type Mapping
```typescript
const ACTIVITY_TYPE_MAP: Record<ActivityType, string> = {
  CALL: 'call',
  EMAIL: 'email', 
  MEETING: 'meeting',
  LINKEDIN: 'task',
  REFERRAL: 'task',
  CONFERENCE: 'meeting'
}
```

#### 2.2 Activity Data Structure
```typescript
interface PipedriveActivityData {
  subject: string;        // Activity subject
  type: string;          // Mapped activity type
  due_date?: string;     // ISO date string (YYYY-MM-DD)
  due_time?: string;     // Time string (HH:MM:SS)
  note?: string;         // Activity note
  person_id: number;     // Pipedrive person ID
  user_id?: number;      // Pipedrive user ID (owner)
}
```

### Implementation Flow
1. Validate contact has Pipedrive ID
2. Map activity type to Pipedrive equivalent
3. Create activity in Pipedrive
4. Update local activity with Pipedrive activity ID
5. Mark activity as replicated

## Technical Requirements

### 3.1 User Table Enhancement
```sql
ALTER TABLE users ADD COLUMN pipedrive_user_id INTEGER;
```

### 3.2 Activity Table Enhancement
```sql
ALTER TABLE activities ADD COLUMN pipedrive_activity_id INTEGER;
ALTER TABLE activities ADD COLUMN replicated_to_pipedrive BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN pipedrive_sync_attempts INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN last_pipedrive_sync_attempt TIMESTAMP;
```

### 3.3 Pipedrive Service Enhancements

#### 3.3.1 User Management
```typescript
interface PipedriveUserService {
  findUserByEmail(email: string): Promise<PipedriveUser | null>;
  storeUserPipedriveId(userId: string, pipedriveUserId: number): Promise<void>;
}
```

#### 3.3.2 Label Management
```typescript
interface PipedriveLabelService {
  findOrCreateLabel(name: string): Promise<number>;
  getWarmLeadLabelId(): Promise<number>;
}
```

#### 3.3.3 Organization Management
```typescript
interface PipedriveOrganizationService {
  createOrganization(data: PipedriveOrganizationData): Promise<number>;
  findOrganizationByName(name: string): Promise<PipedriveOrganization | null>;
}
```

## Error Handling

### 4.1 Retry Logic
- **Activity Replication**: 3 retry attempts with exponential backoff
- **Contact Creation**: 3 retry attempts with exponential backoff
- **Organization Creation**: 3 retry attempts with exponential backoff

### 4.2 Failure Handling
- Failed operations are marked for batch processing
- Toast notifications for immediate failures
- Logging of all failures for debugging

### 4.3 Fallback Strategy
- If Pipedrive API is unavailable, operations are queued for later processing
- No blocking of local operations due to Pipedrive failures
- Graceful degradation when Pipedrive integration fails

## Rate Limiting

### 5.1 Built-in Rate Limiting
- Leverage existing rate limiting in PipedriveService
- Respect Pipedrive API rate limits (100 requests per 10 seconds)
- Implement exponential backoff for rate limit errors

### 5.2 Request Throttling
- Maximum 10 requests per minute per user
- Queue requests when rate limit is approached
- Automatic retry with backoff for rate-limited requests

## Database Schema Updates

### 6.1 User Model
```prisma
model User {
  // ... existing fields
  pipedriveUserId Int? // Pipedrive user ID for owner assignment
}
```

### 6.2 Activity Model
```prisma
model Activity {
  // ... existing fields
  pipedriveActivityId Int? // Pipedrive activity ID
  replicatedToPipedrive Boolean @default(false) // Sync status
  pipedriveSyncAttempts Int @default(0) // Retry counter
  lastPipedriveSyncAttempt DateTime? // Last attempt timestamp
}
```

### 6.3 Contact Model
```prisma
model Contact {
  // ... existing fields (already has pipedrivePersonId and pipedriveOrgId)
  // No additional fields needed
}
```

## API Endpoints

### 7.1 Warm Lead Detection
```typescript
// POST /api/contacts/[id]/check-warm-lead
interface CheckWarmLeadRequest {
  contactId: string;
}

interface CheckWarmLeadResponse {
  success: boolean;
  isWarmLead: boolean;
  pipedrivePersonId?: string;
  pipedriveOrgId?: string;
}
```

### 7.2 Activity Sync Status
```typescript
// GET /api/activities/[id]/sync-status
interface ActivitySyncStatusResponse {
  success: boolean;
  synced: boolean;
  pipedriveActivityId?: string;
  syncAttempts: number;
  lastAttempt?: string;
}
```

### 7.3 Pipedrive User Setup
```typescript
// POST /api/pipedrive/setup-user
interface SetupUserRequest {
  email: string;
}

interface SetupUserResponse {
  success: boolean;
  pipedriveUserId?: number;
  error?: string;
}
```

## Testing Strategy

### 8.1 Unit Tests

#### 8.1.1 Warm Lead Detection
```typescript
describe('WarmLeadService', () => {
  it('should detect warm lead when score >= 4', () => {});
  it('should not create Pipedrive contact if already exists', () => {});
  it('should create organization before contact', () => {});
  it('should assign correct owner to contact', () => {});
  it('should apply Warm Lead label', () => {});
});
```

#### 8.1.2 Activity Replication
```typescript
describe('ActivityReplicationService', () => {
  it('should replicate activity for contact with Pipedrive ID', () => {});
  it('should not replicate activity for contact without Pipedrive ID', () => {});
  it('should map activity types correctly', () => {});
  it('should handle retry logic on failure', () => {});
  it('should update local activity with Pipedrive ID', () => {});
});
```

### 8.2 Integration Tests
```typescript
describe('Pipedrive Integration', () => {
  it('should create contact and organization in Pipedrive', () => {});
  it('should replicate activity in real-time', () => {});
  it('should handle API failures gracefully', () => {});
  it('should respect rate limits', () => {});
});
```

### 8.3 E2E Tests
```typescript
describe('Pipedrive E2E', () => {
  it('should create warm lead contact in Pipedrive', () => {});
  it('should replicate activity when logged', () => {});
  it('should show sync status in UI', () => {});
});
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Database schema updates
- Pipedrive service enhancements
- User Pipedrive ID management
- Label management service

### Phase 2: Warm Lead Creation (Week 2)
- Warm lead detection logic
- Organization creation in Pipedrive
- Contact creation in Pipedrive
- Owner assignment logic

### Phase 3: Activity Replication (Week 3)
- Activity type mapping
- Real-time activity replication
- Retry logic implementation
- Sync status tracking

### Phase 4: Error Handling & Polish (Week 4)
- Comprehensive error handling
- Toast notifications
- Rate limiting implementation
- Testing and documentation

## Success Criteria

### Functional Requirements
- [ ] Warm leads are automatically created in Pipedrive
- [ ] Organizations are created before contacts
- [ ] Activities are replicated in real-time
- [ ] Proper owner assignment in Pipedrive
- [ ] Warm Lead labels are applied

### Non-Functional Requirements
- [ ] 3 retry attempts for failed operations
- [ ] Rate limiting compliance
- [ ] Graceful error handling
- [ ] Real-time operation (no queuing)
- [ ] Toast notifications for failures

### Performance Requirements
- [ ] Contact creation completes within 5 seconds
- [ ] Activity replication completes within 3 seconds
- [ ] No blocking of local operations
- [ ] Respect Pipedrive API rate limits

---

*This specification provides the foundation for implementing robust Pipedrive integration features that enhance the user experience while maintaining system reliability.* 