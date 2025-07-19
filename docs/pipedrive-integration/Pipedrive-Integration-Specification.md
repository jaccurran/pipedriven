# Pipedrive Integration Specification

## Overview

This document specifies the implementation of comprehensive Pipedrive integration features:

1. **Warm Lead Contact Creation**: When a contact becomes a warm lead and doesn't have a Pipedrive ID, create it in Pipedrive with associated organization
2. **Activity Replication**: When activities are added to contacts with Pipedrive IDs, replicate them in Pipedrive
3. **Record Updates**: Ability to update existing Pipedrive records (activities, people, organizations, and deals) through a unified functional interface

## Table of Contents

1. [Feature 1: Warm Lead Contact Creation](#feature-1-warm-lead-contact-creation)
2. [Feature 2: Activity Replication](#feature-2-activity-replication)
3. [Feature 3: Record Updates](#feature-3-record-updates)
4. [Technical Requirements](#technical-requirements)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Database Schema Updates](#database-schema-updates)
8. [API Endpoints](#api-endpoints)
9. [Testing Strategy](#testing-strategy)

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

## Feature 3: Record Updates

### Overview
Provide a unified interface to update existing Pipedrive records (activities, people, organizations, and deals) with proper error handling and validation.

### 3.1 Update Interface Design
```typescript
interface PipedriveUpdateService {
  // Activity Updates
  updateActivity(activityId: string, data: UpdateActivityData): Promise<UpdateResult>;
  
  // Person Updates
  updatePerson(personId: string, data: UpdatePersonData): Promise<UpdateResult>;
  
  // Organization Updates
  updateOrganization(orgId: string, data: UpdateOrganizationData): Promise<UpdateResult>;
  
  // Deal Updates
  updateDeal(dealId: string, data: UpdateDealData): Promise<UpdateResult>;
  
  // Batch Updates
  batchUpdate(updates: BatchUpdateRequest[]): Promise<BatchUpdateResult>;
}
```

### 3.2 Update Data Structures
```typescript
interface UpdateActivityData {
  subject?: string;
  type?: string;
  due_date?: string;
  due_time?: string;
  note?: string;
  person_id?: number;
  user_id?: number;
  done?: boolean;
}

interface UpdatePersonData {
  name?: string;
  email?: string[];
  phone?: string[];
  org_name?: string;
  label_ids?: number[];
  owner_id?: number;
  visible_to?: number;
}

interface UpdateOrganizationData {
  name?: string;
  industry?: string;
  country?: string;
  address?: string;
  visible_to?: number;
}

interface UpdateDealData {
  title?: string;
  value?: number;
  currency?: string;
  stage_id?: number;
  person_id?: number;
  org_id?: number;
  owner_id?: number;
  visible_to?: number;
}
```

### 3.3 Update Result Types
```typescript
interface UpdateResult {
  success: boolean;
  recordId?: string;
  error?: string;
  timestamp: Date;
  retryCount: number;
}

interface BatchUpdateResult {
  success: boolean;
  results: UpdateResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  };
}
```

### 3.4 Update Triggers
- **Manual Updates**: User-initiated updates through UI
- **Sync Updates**: Automatic updates when local data changes
- **Batch Updates**: Bulk operations for multiple records
- **Reconciliation Updates**: Fix inconsistencies between local and Pipedrive data

### 3.5 Update Validation
```typescript
interface UpdateValidation {
  // Pre-update validation
  validateUpdateData(data: any, recordType: string): ValidationResult;
  
  // Conflict detection
  detectConflicts(localData: any, pipedriveData: any): ConflictResult;
  
  // Merge strategy
  mergeData(localData: any, pipedriveData: any, strategy: MergeStrategy): any;
}
```

## Technical Requirements

### 4.1 User Table Enhancement
```sql
ALTER TABLE users ADD COLUMN pipedrive_user_id INTEGER;
```

### 4.2 Activity Table Enhancement
```sql
ALTER TABLE activities ADD COLUMN pipedrive_activity_id INTEGER;
ALTER TABLE activities ADD COLUMN replicated_to_pipedrive BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN pipedrive_sync_attempts INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN last_pipedrive_sync_attempt TIMESTAMP;
ALTER TABLE activities ADD COLUMN last_pipedrive_update TIMESTAMP;
ALTER TABLE activities ADD COLUMN update_sync_status VARCHAR(20) DEFAULT 'SYNCED';
```

### 4.3 Contact Table Enhancement
```sql
ALTER TABLE contacts ADD COLUMN last_pipedrive_update TIMESTAMP;
ALTER TABLE contacts ADD COLUMN update_sync_status VARCHAR(20) DEFAULT 'SYNCED';
```

### 4.4 Organization Table Enhancement
```sql
ALTER TABLE organizations ADD COLUMN last_pipedrive_update TIMESTAMP;
ALTER TABLE organizations ADD COLUMN update_sync_status VARCHAR(20) DEFAULT 'SYNCED';
```

### 4.5 Pipedrive Service Enhancements

#### 4.5.1 User Management
```typescript
interface PipedriveUserService {
  findUserByEmail(email: string): Promise<PipedriveUser | null>;
  storeUserPipedriveId(userId: string, pipedriveUserId: number): Promise<void>;
}
```

#### 4.5.2 Label Management
```typescript
interface PipedriveLabelService {
  findOrCreateLabel(name: string): Promise<number>;
  getWarmLeadLabelId(): Promise<number>;
}
```

#### 4.5.3 Organization Management
```typescript
interface PipedriveOrganizationService {
  createOrganization(data: PipedriveOrganizationData): Promise<number>;
  findOrganizationByName(name: string): Promise<PipedriveOrganization | null>;
  updateOrganization(orgId: string, data: UpdateOrganizationData): Promise<UpdateResult>;
}
```

#### 4.5.4 Update Management
```typescript
interface PipedriveUpdateService {
  updateActivity(activityId: string, data: UpdateActivityData): Promise<UpdateResult>;
  updatePerson(personId: string, data: UpdatePersonData): Promise<UpdateResult>;
  updateOrganization(orgId: string, data: UpdateOrganizationData): Promise<UpdateResult>;
  updateDeal(dealId: string, data: UpdateDealData): Promise<UpdateResult>;
  batchUpdate(updates: BatchUpdateRequest[]): Promise<BatchUpdateResult>;
}
```

## Error Handling

### 5.1 Retry Logic
- **Activity Replication**: 3 retry attempts with exponential backoff
- **Contact Creation**: 3 retry attempts with exponential backoff
- **Organization Creation**: 3 retry attempts with exponential backoff
- **Record Updates**: 3 retry attempts with exponential backoff

### 5.2 Failure Handling
- Failed operations are marked for batch processing
- Toast notifications for immediate failures
- Logging of all failures for debugging
- Update status tracking for reconciliation

### 5.3 Fallback Strategy
- If Pipedrive API is unavailable, operations are queued for later processing
- No blocking of local operations due to Pipedrive failures
- Graceful degradation when Pipedrive integration fails
- Local-first approach with eventual consistency

### 5.4 Conflict Resolution
```typescript
interface ConflictResolution {
  // Last-write-wins strategy
  resolveByTimestamp(localTimestamp: Date, pipedriveTimestamp: Date): 'local' | 'pipedrive';
  
  // Manual resolution
  promptUserForResolution(conflicts: ConflictResult[]): Promise<ResolutionDecision[]>;
  
  // Automatic merge
  autoMerge(localData: any, pipedriveData: any): any;
}
```

## Rate Limiting

### 6.1 Built-in Rate Limiting
- Leverage existing rate limiting in PipedriveService
- Respect Pipedrive API rate limits (100 requests per 10 seconds)
- Implement exponential backoff for rate limit errors

### 6.2 Request Throttling
- Maximum 10 requests per minute per user
- Queue requests when rate limit is approached
- Automatic retry with backoff for rate-limited requests
- Priority queuing for critical operations

## Database Schema Updates

### 7.1 User Model
```prisma
model User {
  // ... existing fields
  pipedriveUserId Int? // Pipedrive user ID for owner assignment
}
```

### 7.2 Activity Model
```prisma
model Activity {
  // ... existing fields
  pipedriveActivityId Int? // Pipedrive activity ID
  replicatedToPipedrive Boolean @default(false) // Sync status
  pipedriveSyncAttempts Int @default(0) // Retry counter
  lastPipedriveSyncAttempt DateTime? // Last attempt timestamp
  lastPipedriveUpdate DateTime? // Last update timestamp
  updateSyncStatus String @default("SYNCED") // SYNCED, PENDING, FAILED
}
```

### 7.3 Contact Model
```prisma
model Contact {
  // ... existing fields (already has pipedrivePersonId and pipedriveOrgId)
  lastPipedriveUpdate DateTime? // Last update timestamp
  updateSyncStatus String @default("SYNCED") // SYNCED, PENDING, FAILED
}
```

### 7.4 Organization Model
```prisma
model Organization {
  // ... existing fields (already has pipedriveOrgId)
  lastPipedriveUpdate DateTime? // Last update timestamp
  updateSyncStatus String @default("SYNCED") // SYNCED, PENDING, FAILED
}
```

## API Endpoints

### 8.1 Warm Lead Detection
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

### 8.2 Activity Sync Status
```typescript
// GET /api/activities/[id]/sync-status
interface ActivitySyncStatusResponse {
  success: boolean;
  synced: boolean;
  pipedriveActivityId?: string;
  syncAttempts: number;
  lastAttempt?: string;
  updateSyncStatus: string;
}
```

### 8.3 Record Updates
```typescript
// PUT /api/pipedrive/activities/[id]
interface UpdateActivityRequest {
  subject?: string;
  type?: string;
  due_date?: string;
  due_time?: string;
  note?: string;
  done?: boolean;
}

// PUT /api/pipedrive/people/[id]
interface UpdatePersonRequest {
  name?: string;
  email?: string[];
  phone?: string[];
  org_name?: string;
  label_ids?: number[];
}

// PUT /api/pipedrive/organizations/[id]
interface UpdateOrganizationRequest {
  name?: string;
  industry?: string;
  country?: string;
  address?: string;
}

// PUT /api/pipedrive/deals/[id]
interface UpdateDealRequest {
  title?: string;
  value?: number;
  currency?: string;
  stage_id?: number;
  person_id?: number;
  org_id?: number;
}

// POST /api/pipedrive/batch-update
interface BatchUpdateRequest {
  recordType: 'activity' | 'person' | 'organization' | 'deal';
  recordId: string;
  data: any;
}
```

### 8.4 Pipedrive User Setup
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

### 9.1 Testing Philosophy Integration

Following our established testing strategy, all Pipedrive integration features will be tested using:

- **TDD Approach**: Write failing tests first, implement minimal code to pass, then refactor
- **Business Behavior Focus**: Test what the system should do, not implementation details
- **Realistic Mocking**: Mock exactly what the code uses with complete, realistic test data
- **Comprehensive Coverage**: Unit (80%), Integration (15%), E2E (5%) test distribution

### 9.2 Unit Tests

#### 9.2.1 Warm Lead Detection
```typescript
describe('WarmLeadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock all dependencies with complete data structures
    vi.mocked(prisma.contact.findUnique).mockResolvedValue({
      id: 'contact-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      warmnessScore: 5,
      pipedrivePersonId: null,
      organization: {
        id: 'org-123',
        name: 'Test Corp',
        pipedriveOrgId: null
      }
    } as any);
  });

  it('should detect warm lead when score >= 4', async () => {
    const result = await service.checkAndCreateWarmLead({
      contactId: 'contact-123',
      userId: 'user-456',
      warmnessScore: 5
    });
    
    expect(result).toBe(true);
    expect(mockPipedriveService.createPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        email: ['john@example.com'],
        label_ids: [expect.any(Number)]
      })
    );
  });

  it('should not create Pipedrive contact if already exists', async () => {
    vi.mocked(prisma.contact.findUnique).mockResolvedValue({
      pipedrivePersonId: 'existing-id'
    } as any);

    const result = await service.checkAndCreateWarmLead({
      contactId: 'contact-123',
      userId: 'user-456',
      warmnessScore: 5
    });

    expect(result).toBe(false);
    expect(mockPipedriveService.createPerson).not.toHaveBeenCalled();
  });

  it('should create organization before contact', async () => {
    mockOrgService.createOrganization.mockResolvedValue(456);

    await service.checkAndCreateWarmLead({
      contactId: 'contact-123',
      userId: 'user-456',
      warmnessScore: 5
    });

    expect(mockOrgService.createOrganization).toHaveBeenCalledWith({
      name: 'Test Corp'
    });
    expect(mockPipedriveService.createPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        org_name: 'Test Corp'
      })
    );
  });
});
```

#### 9.2.2 Activity Replication
```typescript
describe('ActivityReplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.activity.findUnique).mockResolvedValue({
      id: 'activity-123',
      type: 'EMAIL',
      subject: 'Follow up email',
      note: 'Important follow up',
      dueDate: new Date('2025-12-25T10:00:00Z'),
      contact: {
        pipedrivePersonId: '123'
      }
    } as any);
  });

  it('should replicate activity for contact with Pipedrive ID', async () => {
    const result = await service.replicateActivity({
      activityId: 'activity-123',
      contactId: 'contact-456',
      userId: 'user-789'
    });

    expect(result).toBe(true);
    expect(mockPipedriveService.createActivity).toHaveBeenCalledWith({
      subject: 'Follow up email',
      type: 'email',
      due_date: '2025-12-25',
      due_time: '10:00:00',
      note: 'Important follow up',
      person_id: 123
    });
  });

  it('should not replicate activity for contact without Pipedrive ID', async () => {
    vi.mocked(prisma.activity.findUnique).mockResolvedValue({
      contact: { pipedrivePersonId: null }
    } as any);

    const result = await service.replicateActivity({
      activityId: 'activity-123',
      contactId: 'contact-456',
      userId: 'user-789'
    });

    expect(result).toBe(false);
    expect(mockPipedriveService.createActivity).not.toHaveBeenCalled();
  });

  it('should handle retry logic on failure', async () => {
    mockPipedriveService.createActivity
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({ success: true, activityId: 789 });

    const result = await service.replicateActivity({
      activityId: 'activity-123',
      contactId: 'contact-456',
      userId: 'user-789'
    });

    expect(result).toBe(true);
    expect(mockPipedriveService.createActivity).toHaveBeenCalledTimes(2);
  });
});
```

#### 9.2.3 Record Updates
```typescript
describe('PipedriveUpdateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateActivity', () => {
    it('should update activity in Pipedrive', async () => {
      const updateData = {
        subject: 'Updated subject',
        note: 'Updated note',
        done: true
      };

      mockPipedriveService.updateActivity.mockResolvedValue({
        success: true,
        activityId: 123
      });

      const result = await service.updateActivity('activity-123', updateData);

      expect(result.success).toBe(true);
      expect(mockPipedriveService.updateActivity).toHaveBeenCalledWith(
        'activity-123',
        updateData
      );
    });

    it('should handle update conflicts', async () => {
      const updateData = { subject: 'Updated subject' };
      
      mockPipedriveService.updateActivity.mockRejectedValue(
        new Error('Conflict: Record modified by another user')
      );

      const result = await service.updateActivity('activity-123', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflict');
    });
  });

  describe('batchUpdate', () => {
    it('should process multiple updates', async () => {
      const updates = [
        { recordType: 'activity', recordId: 'act-1', data: { subject: 'Update 1' } },
        { recordType: 'person', recordId: 'person-1', data: { name: 'Update 2' } }
      ];

      mockPipedriveService.updateActivity.mockResolvedValue({ success: true });
      mockPipedriveService.updatePerson.mockResolvedValue({ success: true });

      const result = await service.batchUpdate(updates);

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
    });
  });
});
```

### 9.3 Integration Tests
```typescript
describe('Pipedrive Integration', () => {
  it('should create contact and organization in Pipedrive', async () => {
    // Test complete workflow with real database operations
    const contact = await createTestContact({ warmnessScore: 5 });
    const result = await warmLeadService.checkAndCreateWarmLead({
      contactId: contact.id,
      userId: testUser.id,
      warmnessScore: 5
    });

    expect(result).toBe(true);
    
    // Verify database updates
    const updatedContact = await prisma.contact.findUnique({
      where: { id: contact.id }
    });
    expect(updatedContact?.pipedrivePersonId).toBeTruthy();
  });

  it('should replicate activity in real-time', async () => {
    const contact = await createTestContact({ pipedrivePersonId: '123' });
    const activity = await createTestActivity({
      contactId: contact.id,
      type: 'EMAIL',
      subject: 'Test activity'
    });

    const result = await activityReplicationService.replicateActivity({
      activityId: activity.id,
      contactId: contact.id,
      userId: testUser.id
    });

    expect(result).toBe(true);
    
    // Verify activity sync status
    const updatedActivity = await prisma.activity.findUnique({
      where: { id: activity.id }
    });
    expect(updatedActivity?.replicatedToPipedrive).toBe(true);
  });

  it('should handle API failures gracefully', async () => {
    // Mock Pipedrive API failure
    mockPipedriveService.createPerson.mockRejectedValue(
      new Error('API Rate Limit Exceeded')
    );

    const result = await warmLeadService.checkAndCreateWarmLead({
      contactId: 'contact-123',
      userId: 'user-456',
      warmnessScore: 5
    });

    expect(result).toBe(false);
    // Verify local operations continue to work
    const contact = await prisma.contact.findUnique({
      where: { id: 'contact-123' }
    });
    expect(contact).toBeTruthy();
  });
});
```

### 9.4 E2E Tests
```typescript
describe('Pipedrive E2E', () => {
  test('should create warm lead contact in Pipedrive', async ({ page }) => {
    // Login
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="signin-button"]');

    // Navigate to contacts
    await page.goto('/contacts');
    
    // Find a contact and increase warmness score
    const contactCard = page.locator('[data-testid="contact-card"]').first();
    const warmnessButton = contactCard.locator('[data-testid="increase-warmness"]');
    await warmnessButton.click();

    // Check for success toast
    await expect(page.locator('text=Contact created in Pipedrive as Warm Lead!')).toBeVisible();
  });

  test('should replicate activity when logged', async ({ page }) => {
    // Login and navigate to activities
    await page.goto('/activities/new');
    
    // Fill activity form
    await page.fill('[data-testid="activity-subject"]', 'Test Activity');
    await page.selectOption('[data-testid="activity-type"]', 'EMAIL');
    await page.fill('[data-testid="activity-note"]', 'Test note');
    
    // Submit activity
    await page.click('[data-testid="submit-activity"]');
    
    // Check for success message
    await expect(page.locator('text=Activity logged successfully')).toBeVisible();
  });

  test('should update Pipedrive records', async ({ page }) => {
    // Login and navigate to a contact with Pipedrive ID
    await page.goto('/contacts/contact-with-pipedrive-id');
    
    // Edit contact details
    await page.click('[data-testid="edit-contact-button"]');
    await page.fill('[data-testid="contact-name"]', 'Updated Name');
    await page.click('[data-testid="save-contact-button"]');
    
    // Check for sync status update
    await expect(page.locator('text=Contact updated in Pipedrive')).toBeVisible();
  });
});
```

### 9.5 Mock Strategy
```typescript
// __tests__/utils/pipedriveMockManager.ts
export class PipedriveMockManager {
  private mockResponses = new Map<string, any>();

  setUserResponse(email: string, user: PipedriveUser | null) {
    this.mockResponses.set(`user:${email}`, user);
  }

  setLabelResponse(name: string, label: PipedriveLabel) {
    this.mockResponses.set(`label:${name}`, label);
  }

  setOrganizationResponse(name: string, org: PipedriveOrganization) {
    this.mockResponses.set(`org:${name}`, org);
  }

  setUpdateResponse(recordType: string, recordId: string, result: UpdateResult) {
    this.mockResponses.set(`update:${recordType}:${recordId}`, result);
  }

  getMockResponse(key: string) {
    return this.mockResponses.get(key);
  }

  // Reset all mocks between tests
  reset() {
    this.mockResponses.clear();
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Database schema updates
- Pipedrive service enhancements
- User Pipedrive ID management
- Label management service
- **Update service foundation**

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

### Phase 4: Record Updates (Week 4)
- **Update service implementation**
- **Conflict resolution logic**
- **Batch update functionality**
- **Update validation and error handling**

### Phase 5: Error Handling & Polish (Week 5)
- Comprehensive error handling
- Toast notifications
- Rate limiting implementation
- Testing and documentation
- **Update reconciliation features**

## Success Criteria

### Functional Requirements
- [ ] Warm leads are automatically created in Pipedrive
- [ ] Organizations are created before contacts
- [ ] Activities are replicated in real-time
- [ ] Proper owner assignment in Pipedrive
- [ ] Warm Lead labels are applied
- [ ] **Record updates work for all Pipedrive entity types**
- [ ] **Batch updates process multiple records efficiently**
- [ ] **Conflict resolution handles concurrent modifications**

### Non-Functional Requirements
- [ ] 3 retry attempts for failed operations
- [ ] Rate limiting compliance
- [ ] Graceful error handling
- [ ] Real-time operation (no queuing)
- [ ] Toast notifications for failures
- [ ] **Update operations complete within 3 seconds**
- [ ] **Batch operations handle up to 50 records per request**

### Performance Requirements
- [ ] Contact creation completes within 5 seconds
- [ ] Activity replication completes within 3 seconds
- [ ] No blocking of local operations
- [ ] Respect Pipedrive API rate limits
- [ ] **Record updates complete within 3 seconds**
- [ ] **Batch updates complete within 30 seconds for 50 records**

### Testing Requirements
- [ ] **80% unit test coverage for all services**
- [ ] **Integration tests for all API endpoints**
- [ ] **E2E tests for critical user workflows**
- [ ] **Mock strategy covers all Pipedrive API interactions**
- [ ] **Test data factories provide complete, realistic data**
- [ ] **All tests follow TDD principles**

---

*This specification provides the foundation for implementing robust Pipedrive integration features that enhance the user experience while maintaining system reliability and comprehensive test coverage.* 