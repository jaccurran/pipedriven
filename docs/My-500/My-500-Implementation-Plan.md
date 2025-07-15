# My-500 Screen Implementation Plan

## Overview

The My-500 screen is a critical component of Pipedriver that displays a user's prioritized contacts with integrated Pipedrive synchronization. This document outlines the complete implementation strategy, architecture, and technical specifications.

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [Component Architecture](#component-architecture)
6. [Sync Strategy](#sync-strategy)
7. [Performance Considerations](#performance-considerations)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Considerations](#deployment-considerations)

## Functional Requirements

### Core Features

#### 1. Contact Display
- **Prioritized List**: Display contacts sorted by priority algorithm
- **Contact Cards**: Show name, email, organization, status indicators
- **Activity Indicators**: Visual cues for contact status (cold/warm/hot)
- **Search & Filter**: Real-time search and filtering capabilities

#### 2. Priority Algorithm
```typescript
// Priority order (highest to lowest):
1. Campaign Contacts (addedToCampaign = true)
2. Warmness Score (ASC - lower scores first)
3. Last Contacted Date (ASC - older dates first, null first)
4. Creation Date (DESC - newest first as tiebreaker)
```

#### 3. Action System
- **Primary Actions** (always visible):
  - Email
  - Meeting Request
  - Meeting
- **Secondary Actions** (ellipsis menu):
  - LinkedIn
  - Phone Call
  - Conference
- **Contact Details**: Click name to edit
- **Notes**: Separate notes functionality

#### 4. Pipedrive Integration
- **Automatic Import**: Import contacts on first visit
- **Incremental Sync**: Sync only changed contacts
- **Manual Sync**: User-triggered sync button
- **Conflict Resolution**: Handle duplicate contacts

### User Experience Requirements

#### 1. Loading States
- **Initial Load**: Progress indicator for first-time import
- **Sync Operations**: Progress bar with contact count
- **Search**: Debounced search with loading indicator

#### 2. Performance Targets
- **Initial Load**: <3 seconds for 500 contacts
- **Incremental Sync**: <1 second for changed contacts
- **Search**: <200ms response time
- **Action Response**: <500ms for activity creation

#### 3. Mobile Optimization
- **Responsive Design**: Mobile-first approach
- **Touch Gestures**: Swipe actions for quick actions
- **Virtual Scrolling**: Handle large contact lists efficiently

## Technical Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Pipedrive     │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local State   │    │   Database      │    │   Rate Limiting │
│   (React)       │    │   (Prisma)      │    │   (100/10s)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

#### 1. Initial Load Flow
```
User visits My-500 → Check local contacts → If empty, import from Pipedrive → 
Apply priority sorting → Display contacts → Cache results
```

#### 2. Sync Flow
```
User triggers sync → Check last sync timestamp → Fetch changed contacts → 
Update local database → Re-sort contacts → Update UI
```

#### 3. Action Flow
```
User clicks action → Create activity locally → Update contact status → 
If contact is warm, sync to Pipedrive → Update UI
```

## Database Schema

### Required Schema Updates

#### 1. User Table Extension
```sql
ALTER TABLE users ADD COLUMN lastSyncTimestamp TIMESTAMP;
ALTER TABLE users ADD COLUMN syncStatus TEXT DEFAULT 'NOT_SYNCED';
ALTER TABLE users ADD COLUMN pipedriveApiKey TEXT;
```

#### 2. Contact Table Extension
```sql
ALTER TABLE contacts ADD COLUMN syncStatus TEXT DEFAULT 'SYNCED';
ALTER TABLE contacts ADD COLUMN lastPipedriveUpdate TIMESTAMP;
ALTER TABLE contacts ADD COLUMN warmnessScore INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN lastContacted TIMESTAMP;
ALTER TABLE contacts ADD COLUMN addedToCampaign BOOLEAN DEFAULT FALSE;
```

#### 3. Sync History Table
```sql
CREATE TABLE sync_history (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  syncType TEXT NOT NULL, -- 'FULL', 'INCREMENTAL', 'SEARCH'
  contactsProcessed INTEGER DEFAULT 0,
  contactsUpdated INTEGER DEFAULT 0,
  contactsFailed INTEGER DEFAULT 0,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
  error TEXT,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Indexes for Performance
```sql
-- Contact queries
CREATE INDEX idx_contacts_user_warmness ON contacts(userId, warmnessScore);
CREATE INDEX idx_contacts_user_last_contacted ON contacts(userId, lastContacted);
CREATE INDEX idx_contacts_user_campaign ON contacts(userId, addedToCampaign);
CREATE INDEX idx_contacts_pipedrive_id ON contacts(pipedrivePersonId);

-- Sync history queries
CREATE INDEX idx_sync_history_user_status ON sync_history(userId, status);
CREATE INDEX idx_sync_history_start_time ON sync_history(startTime);
```

## API Design

### Core Endpoints

#### 1. My-500 Data Endpoint
```typescript
GET /api/my-500
Response: {
  contacts: ContactWithActivities[],
  syncStatus: {
    lastSync: string,
    totalContacts: number,
    syncedContacts: number,
    pendingSync: boolean
  },
  pagination: {
    page: number,
    limit: number,
    total: number,
    hasMore: boolean
  }
}
```

#### 2. Pipedrive Sync Endpoint
```typescript
POST /api/pipedrive/contacts/sync
Body: {
  syncType: 'FULL' | 'INCREMENTAL' | 'SEARCH',
  sinceTimestamp?: string,
  contactIds?: string[]
}
Response: {
  success: boolean,
  synced: number,
  failed: number,
  total: number,
  syncId: string
}
```

#### 3. Contact Search Endpoint
```typescript
GET /api/my-500/search?q=searchTerm&page=1&limit=20
Response: {
  contacts: ContactWithActivities[],
  total: number,
  page: number,
  hasMore: boolean
}
```

#### 4. Activity Creation Endpoint
```typescript
POST /api/activities
Body: {
  contactId: string,
  type: ActivityType,
  subject?: string,
  note?: string,
  dueDate?: string
}
Response: {
  success: boolean,
  activityId: string,
  pipedriveActivityId?: string
}
```

### Error Handling

#### 1. Sync Errors
```typescript
interface SyncError {
  code: 'RATE_LIMIT' | 'API_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';
  message: string;
  retryAfter?: number;
  details?: any;
}
```

#### 2. User Feedback
```typescript
interface SyncStatus {
  status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  message: string;
  progress?: number;
  error?: SyncError;
}
```

## Component Architecture

### Component Hierarchy

```
My500Page (Server Component)
├── My500Client (Client Component)
│   ├── My500Header
│   │   ├── PageTitle
│   │   ├── ContactCount
│   │   ├── SyncButton
│   │   └── SyncStatus
│   ├── My500Search
│   │   ├── SearchInput
│   │   ├── FilterDropdown
│   │   └── SortOptions
│   ├── My500ContactList
│   │   ├── VirtualList (for performance)
│   │   └── ContactCard[]
│   │       ├── ContactInfo
│   │       ├── StatusIndicator
│   │       ├── ActionButtons
│   │       └── ActivityIndicator
│   ├── ContactDetailSlideover
│   │   ├── ContactDetails
│   │   ├── ActivityHistory
│   │   └── ActionButtons
│   └── ActivityModal
│       ├── ActivityForm
│       └── CampaignSelector
```

### Key Components

#### 1. My500Client Component
```typescript
'use client'

interface My500ClientProps {
  initialContacts: ContactWithActivities[];
  user: User;
  syncStatus: SyncStatus;
}

export function My500Client({ initialContacts, user, syncStatus }: My500ClientProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Sync logic
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncContacts();
      setContacts(result.contacts);
    } catch (error) {
      // Handle error
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Search logic
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.organisation?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <My500Header 
        contactCount={contacts.length}
        syncStatus={syncStatus}
        onSync={handleSync}
        isSyncing={isSyncing}
      />
      <My500Search 
        value={searchTerm}
        onChange={setSearchTerm}
      />
      <My500ContactList 
        contacts={filteredContacts}
        onContactSelect={setSelectedContact}
      />
      {selectedContact && (
        <ContactDetailSlideover
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}
```

#### 2. ContactCard Component
```typescript
interface ContactCardProps {
  contact: ContactWithActivities;
  onAction: (contact: Contact, action: ActionType) => void;
  onSelect: (contact: Contact) => void;
}

export function ContactCard({ contact, onAction, onSelect }: ContactCardProps) {
  const status = getContactStatus(contact);
  const priority = getContactPriority(contact);
  const needsAttention = needsAttention(contact);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(contact)}
              className="font-semibold text-lg text-gray-900 hover:text-blue-600"
            >
              {contact.name}
            </button>
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
          </div>
          
          <div className="text-sm text-gray-500 mt-1">
            {contact.organisation && (
              <span className="mr-2">{contact.organisation}</span>
            )}
            {contact.email && (
              <span>{contact.email}</span>
            )}
          </div>
          
          {needsAttention && (
            <div className="mt-2 text-xs text-red-600 font-medium">
              Needs attention
            </div>
          )}
          
          {contact.activities.length > 0 && (
            <div className="mt-1 text-xs text-gray-400">
              Last activity: {formatActivity(contact.activities[0])}
            </div>
          )}
        </div>
        
        <div className="flex gap-1 ml-4">
          <QuickActionButton
            type="EMAIL"
            onClick={() => onAction(contact, 'EMAIL')}
            disabled={!contact.email}
          />
          <QuickActionButton
            type="MEETING_REQUEST"
            onClick={() => onAction(contact, 'MEETING_REQUEST')}
          />
          <QuickActionButton
            type="MEETING"
            onClick={() => onAction(contact, 'MEETING')}
          />
          <ActionMenu
            contact={contact}
            onAction={(action) => onAction(contact, action)}
          />
        </div>
      </div>
    </div>
  );
}
```

## Sync Strategy

### 1. Incremental Sync Implementation

#### Sync Service
```typescript
export class PipedriveSyncService {
  constructor(private userId: string, private apiKey: string) {}
  
  async incrementalSync(): Promise<SyncResult> {
    const user = await this.getUser();
    const sinceTimestamp = user.lastSyncTimestamp;
    
    if (!sinceTimestamp) {
      return this.fullSync();
    }
    
    const changedContacts = await this.fetchChangedContacts(sinceTimestamp);
    const result = await this.processContacts(changedContacts);
    
    await this.updateLastSyncTimestamp();
    return result;
  }
  
  private async fetchChangedContacts(sinceTimestamp: Date): Promise<PipedriveContact[]> {
    const url = `/persons?since_timestamp=${sinceTimestamp.toISOString()}`;
    const response = await this.makeApiRequest(url);
    return response.data || [];
  }
  
  private async processContacts(contacts: PipedriveContact[]): Promise<SyncResult> {
    const results = await Promise.allSettled(
      contacts.map(contact => this.processContact(contact))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;
    
    return { successful, failed, total: contacts.length };
  }
}
```

#### Sync Queue Management
```typescript
export class SyncQueue {
  private queue: SyncJob[] = [];
  private processing = false;
  
  async addJob(job: SyncJob): Promise<void> {
    this.queue.push(job);
    if (!this.processing) {
      await this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      try {
        await this.processJob(job);
      } catch (error) {
        console.error('Sync job failed:', error);
        // Retry logic
      }
      
      // Rate limiting delay
      await this.delay(100);
    }
    
    this.processing = false;
  }
}
```

### 2. Conflict Resolution

#### Contact Matching Strategy
```typescript
export class ContactMatcher {
  static findMatch(pipedriveContact: PipedriveContact, localContacts: Contact[]): Contact | null {
    // 1. Match by Pipedrive ID
    const byPipedriveId = localContacts.find(c => c.pipedrivePersonId === pipedriveContact.id.toString());
    if (byPipedriveId) return byPipedriveId;
    
    // 2. Match by email
    const byEmail = localContacts.find(c => c.email === pipedriveContact.email?.[0]?.value);
    if (byEmail) return byEmail;
    
    // 3. Match by name and organization
    const byNameAndOrg = localContacts.find(c => 
      c.name === pipedriveContact.name && 
      c.organisation === pipedriveContact.org_name
    );
    if (byNameAndOrg) return byNameAndOrg;
    
    return null;
  }
  
  static shouldUpdate(localContact: Contact, pipedriveContact: PipedriveContact): boolean {
    const localUpdated = new Date(localContact.updatedAt);
    const pipedriveUpdated = new Date(pipedriveContact.update_time);
    
    return pipedriveUpdated > localUpdated;
  }
}
```

## Performance Considerations

### 1. Virtual Scrolling

#### Implementation
```typescript
import { FixedSizeList as List } from 'react-window';

export function VirtualContactList({ contacts }: { contacts: Contact[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ContactCard contact={contacts[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={contacts.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### 2. Caching Strategy

#### React Query Implementation
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMy500Contacts() {
  return useQuery({
    queryKey: ['my500', 'contacts'],
    queryFn: () => fetchMy500Contacts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSyncContacts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: syncContacts,
    onSuccess: () => {
      queryClient.invalidateQueries(['my500', 'contacts']);
    },
  });
}
```

### 3. Debounced Search

#### Implementation
```typescript
import { useDebouncedCallback } from 'use-debounce';

export function useContactSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setDebouncedSearchTerm(value),
    300
  );
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSetSearch(value);
  };
  
  return {
    searchTerm,
    debouncedSearchTerm,
    handleSearchChange,
  };
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### Day 1-2: Database Schema
- [ ] Update User table with sync fields
- [ ] Update Contact table with sync fields
- [ ] Create SyncHistory table
- [ ] Add performance indexes

#### Day 3-4: API Endpoints
- [ ] Implement My-500 data endpoint
- [ ] Implement Pipedrive sync endpoint
- [ ] Implement contact search endpoint
- [ ] Add error handling and validation

#### Day 5: Sync Service
- [ ] Implement PipedriveSyncService
- [ ] Add incremental sync logic
- [ ] Implement conflict resolution
- [ ] Add rate limiting

### Phase 2: Frontend Components (Week 2)

#### Day 1-2: Core Components
- [ ] Create My500Client component
- [ ] Implement ContactCard component
- [ ] Add status and priority indicators
- [ ] Implement action buttons

#### Day 3-4: Search and Filtering
- [ ] Implement search functionality
- [ ] Add filtering options
- [ ] Implement debounced search
- [ ] Add virtual scrolling

#### Day 5: Activity System
- [ ] Implement ActivityModal
- [ ] Add activity creation logic
- [ ] Implement Pipedrive activity sync
- [ ] Add activity history display

### Phase 3: Sync Integration (Week 3)

#### Day 1-2: Initial Import
- [ ] Implement first-time import logic
- [ ] Add progress indicators
- [ ] Handle import errors
- [ ] Add import completion feedback

#### Day 3-4: Incremental Sync
- [ ] Implement incremental sync UI
- [ ] Add sync status indicators
- [ ] Implement sync queue
- [ ] Add retry logic

#### Day 5: Conflict Resolution
- [ ] Implement contact matching
- [ ] Add conflict resolution UI
- [ ] Handle sync conflicts
- [ ] Add sync history

### Phase 4: Performance & Polish (Week 4)

#### Day 1-2: Performance Optimization
- [ ] Implement virtual scrolling
- [ ] Add React Query caching
- [ ] Optimize bundle size
- [ ] Add performance monitoring

#### Day 3-4: Mobile Optimization
- [ ] Implement mobile layout
- [ ] Add touch gestures
- [ ] Optimize for mobile performance
- [ ] Add mobile-specific features

#### Day 5: Testing & Documentation
- [ ] Write comprehensive tests
- [ ] Add error boundaries
- [ ] Create user documentation
- [ ] Performance testing

## Testing Strategy

### 1. Unit Tests

#### Component Tests
```typescript
describe('ContactCard', () => {
  it('should display contact information correctly', () => {
    const contact = createMockContact();
    render(<ContactCard contact={contact} />);
    
    expect(screen.getByText(contact.name)).toBeInTheDocument();
    expect(screen.getByText(contact.email)).toBeInTheDocument();
  });
  
  it('should trigger action when button clicked', () => {
    const onAction = jest.fn();
    const contact = createMockContact();
    
    render(<ContactCard contact={contact} onAction={onAction} />);
    
    fireEvent.click(screen.getByLabelText('Email'));
    expect(onAction).toHaveBeenCalledWith(contact, 'EMAIL');
  });
});
```

#### Service Tests
```typescript
describe('PipedriveSyncService', () => {
  it('should perform incremental sync correctly', async () => {
    const service = new PipedriveSyncService('user-1', 'api-key');
    const result = await service.incrementalSync();
    
    expect(result.successful).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
  });
});
```

### 2. Integration Tests

#### API Tests
```typescript
describe('/api/my-500', () => {
  it('should return user contacts with proper sorting', async () => {
    const response = await request(app)
      .get('/api/my-500')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.contacts).toBeSortedBy('warmnessScore');
  });
});
```

### 3. E2E Tests

#### User Flow Tests
```typescript
describe('My-500 User Flow', () => {
  it('should import contacts and display them correctly', async () => {
    await page.goto('/my-500');
    
    // Wait for initial import
    await page.waitForSelector('[data-testid="contact-card"]');
    
    // Verify contacts are displayed
    const contactCards = await page.$$('[data-testid="contact-card"]');
    expect(contactCards.length).toBeGreaterThan(0);
    
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'test@example.com');
    await page.waitForTimeout(300);
    
    const filteredCards = await page.$$('[data-testid="contact-card"]');
    expect(filteredCards.length).toBeLessThanOrEqual(contactCards.length);
  });
});
```

## Deployment Considerations

### 1. Environment Configuration

#### Required Environment Variables
```bash
# Pipedrive API Configuration
PIPEDRIVE_API_URL=https://api.pipedrive.com/v1
PIPEDRIVE_RATE_LIMIT=100
PIPEDRIVE_RATE_LIMIT_WINDOW=10

# Database Configuration
DATABASE_URL=postgresql://...

# Application Configuration
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

### 2. Monitoring & Logging

#### Performance Monitoring
```typescript
// Add performance monitoring
export function trackSyncPerformance(syncType: string, duration: number) {
  analytics.track('sync_performance', {
    syncType,
    duration,
    timestamp: new Date().toISOString(),
  });
}
```

#### Error Tracking
```typescript
// Add error tracking
export function trackSyncError(error: Error, context: any) {
  analytics.track('sync_error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}
```

### 3. Rate Limiting

#### Implementation
```typescript
export class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private window: number;
  
  constructor(limit: number, window: number) {
    this.limit = limit;
    this.window = window;
  }
  
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);
    
    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

## Success Metrics

### 1. Performance Metrics
- **Initial Load Time**: <3 seconds for 500 contacts
- **Incremental Sync Time**: <1 second for changed contacts
- **Search Response Time**: <200ms
- **Action Response Time**: <500ms

### 2. User Experience Metrics
- **User Engagement**: Time spent on My-500 page
- **Action Completion Rate**: Percentage of actions completed
- **Sync Success Rate**: Percentage of successful syncs
- **Error Rate**: Percentage of failed operations

### 3. Technical Metrics
- **API Response Times**: Average response times for all endpoints
- **Database Query Performance**: Query execution times
- **Memory Usage**: Application memory consumption
- **Error Rates**: Application error rates

## Conclusion

This implementation plan provides a comprehensive roadmap for building the My-500 screen with full Pipedrive integration. The architecture is designed for performance, scalability, and excellent user experience. The phased approach ensures steady progress while maintaining code quality and testing coverage.

The key success factors are:
1. **Efficient sync strategy** using incremental updates
2. **Performance optimization** with virtual scrolling and caching
3. **Robust error handling** with retry logic and fallbacks
4. **Excellent user experience** with loading states and progress indicators
5. **Comprehensive testing** at all levels

This implementation will provide users with a powerful, efficient, and user-friendly contact management experience that seamlessly integrates with their Pipedrive data. 