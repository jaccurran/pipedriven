# My-500 Technical Specification

## Overview

This document provides detailed technical specifications for the My-500 screen implementation, including API endpoints, data models, component specifications, and integration requirements.

## Table of Contents

1. [API Specifications](#api-specifications)
2. [Data Models](#data-models)
3. [Component Specifications](#component-specifications)
4. [Database Schema](#database-schema)
5. [Integration Specifications](#integration-specifications)
6. [Performance Requirements](#performance-requirements)
7. [Security Specifications](#security-specifications)
8. [Error Handling](#error-handling)
9. [Testing Specifications](#testing-specifications)
10. [Deployment Specifications](#deployment-specifications)
11. [Sync Features](#sync-features)

## API Specifications

### 1. My-500 Data Endpoint

#### GET /api/my-500

**Purpose**: Retrieve user's prioritized contacts with sync status

**Authentication**: Required (NextAuth session)

**Query Parameters**:
```typescript
interface My500QueryParams {
  page?: number;        // Default: 1
  limit?: number;       // Default: 50, Max: 100
  search?: string;      // Optional search term
  filter?: string;      // Optional filter (campaign, status, etc.)
  sort?: string;        // Optional sort field
  order?: 'asc' | 'desc'; // Default: asc
}
```

**Response**:
```typescript
interface My500Response {
  success: boolean;
  data: {
    contacts: ContactWithActivities[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    syncStatus: {
      lastSync: string | null;
      totalContacts: number;
      syncedContacts: number;
      pendingSync: boolean;
      syncInProgress: boolean;
    };
    filters: {
      available: FilterOption[];
      applied: string[];
    };
  };
  error?: string;
}
```

**Example Request**:
```bash
GET /api/my-500?page=1&limit=20&search=john&filter=campaign
Authorization: Bearer <token>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "contact-1",
        "name": "John Doe",
        "email": "john@example.com",
        "organisation": "Tech Corp",
        "warmnessScore": 7,
        "lastContacted": "2024-01-15T10:30:00Z",
        "addedToCampaign": true,
        "pipedrivePersonId": "123",
        "syncStatus": "SYNCED",
        "activities": [
          {
            "id": "activity-1",
            "type": "EMAIL",
            "subject": "Follow up",
            "createdAt": "2024-01-15T10:30:00Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "syncStatus": {
      "lastSync": "2024-01-15T09:00:00Z",
      "totalContacts": 150,
      "syncedContacts": 145,
      "pendingSync": false,
      "syncInProgress": false
    }
  }
}
```

### 2. Pipedrive Sync Endpoint

#### POST /api/pipedrive/contacts/sync

**Purpose**: Synchronize contacts with Pipedrive

**Authentication**: Required (NextAuth session)

**Request Body**:
```typescript
interface SyncRequest {
  syncType: 'FULL' | 'INCREMENTAL' | 'SEARCH';
  sinceTimestamp?: string;        // ISO string for incremental sync
  contactIds?: string[];          // Specific contacts for search sync
  force?: boolean;                // Force sync even if no changes
  enableProgress?: boolean;       // Enable real-time progress updates
  batchSize?: number;             // Override default batch size
}
```

**Response**:
```typescript
interface SyncResponse {
  success: boolean;
  data: {
    syncId: string;
    syncType: string;
    progressUrl?: string;         // SSE endpoint for progress updates
    results: {
      total: number;
      processed: number;
      updated: number;
      created: number;
      failed: number;
      errors: SyncError[];
      batches?: {
        total: number;
        completed: number;
        failed: number;
      };
    };
    timestamp: string;
    duration: number; // milliseconds
  };
  error?: string;
}
```

**Example Request**:
```json
{
  "syncType": "INCREMENTAL",
  "sinceTimestamp": "2024-01-15T09:00:00Z",
  "enableProgress": true,
  "batchSize": 50
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "syncId": "sync-123",
    "syncType": "INCREMENTAL",
    "progressUrl": "/api/pipedrive/contacts/sync/progress/sync-123",
    "results": {
      "total": 25,
      "processed": 25,
      "updated": 20,
      "created": 5,
      "failed": 0,
      "errors": [],
      "batches": {
        "total": 1,
        "completed": 1,
        "failed": 0
      }
    },
    "timestamp": "2024-01-15T10:00:00Z",
    "duration": 1250
  }
}
```

### 3. Progress Updates Endpoint

#### GET /api/pipedrive/contacts/sync/progress/{syncId}

**Purpose**: Server-Sent Events stream for real-time progress updates

**Authentication**: Required (NextAuth session)

**Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Format**:
```
event: progress
data: {"type":"progress","data":{"syncId":"sync-123","totalContacts":1000,"processedContacts":250,"currentContact":"John Doe","percentage":25,"status":"processing","batchNumber":5,"totalBatches":20}}

event: complete
data: {"type":"complete","data":{"syncId":"sync-123","totalContacts":1000,"processedContacts":1000,"percentage":100,"status":"completed"}}
```

### 4. Cancel Sync Endpoint

#### POST /api/pipedrive/contacts/sync/{syncId}/cancel

**Purpose**: Cancel an in-progress sync

**Authentication**: Required (NextAuth session)

**Response**:
```typescript
interface CancelSyncResponse {
  success: boolean;
  data: {
    syncId: string;
    status: 'cancelled';
    processedContacts: number;
    totalContacts: number;
  };
  error?: string;
}
```

### 3. Contact Search Endpoint

#### GET /api/my-500/search

**Purpose**: Search contacts with advanced filtering

**Authentication**: Required (NextAuth session)

**Query Parameters**:
```typescript
interface SearchQueryParams {
  q: string;                      // Search query
  page?: number;                  // Default: 1
  limit?: number;                 // Default: 20
  filters?: string;               // JSON string of filters
  sort?: string;                  // Sort field
  order?: 'asc' | 'desc';         // Sort order
}
```

**Response**:
```typescript
interface SearchResponse {
  success: boolean;
  data: {
    contacts: ContactWithActivities[];
    pagination: PaginationInfo;
    searchStats: {
      query: string;
      totalResults: number;
      searchTime: number; // milliseconds
    };
  };
  error?: string;
}
```

### 4. Activity Creation Endpoint

#### POST /api/activities

**Purpose**: Create activity for contact

**Authentication**: Required (NextAuth session)

**Request Body**:
```typescript
interface CreateActivityRequest {
  contactId: string;
  type: ActivityType;
  subject?: string;
  note?: string;
  dueDate?: string;               // ISO string
  campaignId?: string;
  syncToPipedrive?: boolean;      // Default: true for warm contacts
}
```

**Response**:
```typescript
interface CreateActivityResponse {
  success: boolean;
  data: {
    activityId: string;
    pipedriveActivityId?: string;
    syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  };
  error?: string;
}
```

## Data Models

### Contact Model

```typescript
interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organisation?: string;
  jobTitle?: string;
  
  // Priority and Status
  warmnessScore: number;          // 0-10 scale
  lastContacted?: Date;
  addedToCampaign: boolean;
  
  // Pipedrive Integration
  pipedrivePersonId?: string;
  pipedriveOrgId?: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  lastPipedriveUpdate?: Date;
  
  // Metadata
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactWithActivities extends Contact {
  activities: Activity[];
  _count?: {
    activities: number;
  };
}
```

### Activity Model

```typescript
interface Activity {
  id: string;
  type: ActivityType;
  subject?: string;
  note?: string;
  dueDate?: Date;
  
  // Relations
  contactId?: string;
  campaignId?: string;
  userId: string;
  
  // Pipedrive Integration
  pipedriveActivityId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

type ActivityType = 'EMAIL' | 'MEETING_REQUEST' | 'MEETING' | 'LINKEDIN' | 'PHONE_CALL' | 'CONFERENCE';
```

### Sync History Model

```typescript
interface SyncHistory {
  id: string;
  userId: string;
  syncType: 'FULL' | 'INCREMENTAL' | 'SEARCH';
  
  // Results
  contactsProcessed: number;
  contactsUpdated: number;
  contactsCreated: number;
  contactsFailed: number;
  
  // Timing
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  
  // Status
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  error?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

## Component Specifications

### My500Client Component

```typescript
interface My500ClientProps {
  initialContacts: ContactWithActivities[];
  user: User;
  syncStatus: SyncStatus;
  initialPagination: PaginationInfo;
}

interface My500ClientState {
  contacts: ContactWithActivities[];
  searchTerm: string;
  selectedContact: Contact | null;
  isSyncing: boolean;
  syncProgress: number;
  error: string | null;
  pagination: PaginationInfo;
  filters: FilterState;
}
```

**Key Methods**:
```typescript
class My500Client {
  // Sync Management
  handleSync(): Promise<void>;
  handleIncrementalSync(): Promise<void>;
  handleFullSync(): Promise<void>;
  
  // Search and Filtering
  handleSearch(term: string): void;
  handleFilterChange(filters: FilterState): void;
  handleSortChange(sort: SortOption): void;
  
  // Contact Management
  handleContactSelect(contact: Contact): void;
  handleContactAction(contact: Contact, action: ActionType): void;
  handleContactEdit(contact: Contact, updates: Partial<Contact>): void;
  
  // Pagination
  handlePageChange(page: number): void;
  handleLoadMore(): void;
}
```

### ContactCard Component

```typescript
interface ContactCardProps {
  contact: ContactWithActivities;
  onAction: (contact: Contact, action: ActionType) => void;
  onSelect: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

interface ContactCardState {
  isHovered: boolean;
  isActionMenuOpen: boolean;
  isEditing: boolean;
}
```

**Key Features**:
- Responsive design for mobile and desktop
- Hover states and animations
- Action button tooltips
- Status indicator badges
- Activity history preview
- Quick edit functionality

### VirtualList Component

```typescript
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Default: 5
  onScroll?: (scrollTop: number) => void;
}

interface VirtualListState {
  scrollTop: number;
  visibleRange: {
    start: number;
    end: number;
  };
  containerHeight: number;
}
```

**Performance Optimizations**:
- Only render visible items
- Item height caching
- Scroll position optimization
- Memory management for large lists

## Database Schema

### Required Schema Updates

```sql
-- User table extensions
ALTER TABLE users 
ADD COLUMN lastSyncTimestamp TIMESTAMP,
ADD COLUMN syncStatus TEXT DEFAULT 'NOT_SYNCED',
ADD COLUMN pipedriveApiKey TEXT;

-- Contact table extensions
ALTER TABLE contacts 
ADD COLUMN syncStatus TEXT DEFAULT 'SYNCED',
ADD COLUMN lastPipedriveUpdate TIMESTAMP,
ADD COLUMN warmnessScore INTEGER DEFAULT 0,
ADD COLUMN lastContacted TIMESTAMP,
ADD COLUMN addedToCampaign BOOLEAN DEFAULT FALSE,
ADD COLUMN jobTitle TEXT;

-- Sync history table
CREATE TABLE sync_history (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  syncType TEXT NOT NULL,
  contactsProcessed INTEGER DEFAULT 0,
  contactsUpdated INTEGER DEFAULT 0,
  contactsCreated INTEGER DEFAULT 0,
  contactsFailed INTEGER DEFAULT 0,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP,
  duration INTEGER,
  status TEXT DEFAULT 'PENDING',
  error TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_contacts_user_warmness ON contacts(userId, warmnessScore);
CREATE INDEX idx_contacts_user_last_contacted ON contacts(userId, lastContacted);
CREATE INDEX idx_contacts_user_campaign ON contacts(userId, addedToCampaign);
CREATE INDEX idx_contacts_pipedrive_id ON contacts(pipedrivePersonId);
CREATE INDEX idx_contacts_sync_status ON contacts(syncStatus);
CREATE INDEX idx_sync_history_user_status ON sync_history(userId, status);
CREATE INDEX idx_sync_history_start_time ON sync_history(startTime);
```

### Prisma Schema Updates

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  role              UserRole @default(CONSULTANT)
  pipedriveApiKey   String?
  lastSyncTimestamp DateTime?
  syncStatus        String   @default("NOT_SYNCED")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  contacts          Contact[]
  activities        Activity[]
  syncHistory       SyncHistory[]

  @@map("users")
}

model Contact {
  id                   String    @id @default(cuid())
  name                 String
  email                String?
  phone                String?
  organisation         String?
  jobTitle             String?
  warmnessScore        Int       @default(0)
  lastContacted        DateTime?
  addedToCampaign      Boolean   @default(false)
  pipedrivePersonId    String?
  pipedriveOrgId       String?
  syncStatus           String    @default("SYNCED")
  lastPipedriveUpdate  DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  userId               String
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  activities           Activity[]

  @@map("contacts")
}

model SyncHistory {
  id                String   @id @default(cuid())
  userId            String
  syncType          String
  contactsProcessed Int      @default(0)
  contactsUpdated   Int      @default(0)
  contactsCreated   Int      @default(0)
  contactsFailed    Int      @default(0)
  startTime         DateTime
  endTime           DateTime?
  duration          Int?
  status            String   @default("PENDING")
  error             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sync_history")
}
```

## Integration Specifications

### Pipedrive API Integration

#### Service Interface

```typescript
interface PipedriveService {
  // Connection
  testConnection(): Promise<ConnectionTestResult>;
  
  // Contact Management
  getPersons(sinceTimestamp?: string): Promise<PersonsResult>;
  createPerson(contact: Contact): Promise<PersonResult>;
  updatePerson(contact: Contact): Promise<PersonResult>;
  searchPersons(query: string): Promise<PersonsResult>;
  
  // Activity Management
  createActivity(activity: Activity): Promise<ActivityResult>;
  updateActivity(activity: Activity): Promise<ActivityResult>;
  
  // Organization Management
  getOrganizations(): Promise<OrganizationsResult>;
  createOrganization(org: Organization): Promise<OrganizationResult>;
}

interface ConnectionTestResult {
  success: boolean;
  user?: PipedriveUser;
  error?: string;
  diagnostics?: {
    responseTime: number;
    apiVersion: string;
    rateLimit: RateLimitInfo;
  };
}
```

#### Rate Limiting Implementation

```typescript
class PipedriveRateLimiter {
  private requests: number[] = [];
  private limit: number = 100;
  private window: number = 10000; // 10 seconds

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

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);
    return this.limit - this.requests.length;
  }
}
```

### Sync Strategy Implementation

```typescript
class PipedriveSyncService {
  constructor(
    private userId: string,
    private apiKey: string,
    private rateLimiter: PipedriveRateLimiter
  ) {}

  async incrementalSync(sinceTimestamp: Date): Promise<SyncResult> {
    await this.rateLimiter.waitForSlot();
    
    const changedContacts = await this.fetchChangedContacts(sinceTimestamp);
    const result = await this.processContacts(changedContacts);
    
    await this.updateLastSyncTimestamp();
    return result;
  }

  async fullSync(): Promise<SyncResult> {
    const allContacts = await this.fetchAllContacts();
    const result = await this.processContacts(allContacts);
    
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

## Performance Requirements

### Response Time Targets

| Operation | Target | Acceptable | Unacceptable |
|-----------|--------|------------|--------------|
| Initial Page Load | <2s | <3s | >5s |
| Incremental Sync | <1s | <2s | >3s |
| Search Response | <200ms | <500ms | >1s |
| Action Creation | <500ms | <1s | >2s |
| Contact Import | <3s | <5s | >10s |

### Memory Usage Targets

| Component | Target | Acceptable |
|-----------|--------|------------|
| Contact List (500 items) | <50MB | <100MB |
| Virtual Scrolling | <20MB | <50MB |
| Search Cache | <10MB | <25MB |
| Sync Queue | <5MB | <15MB |

### Database Performance

| Query Type | Target | Acceptable |
|------------|--------|------------|
| Contact List | <100ms | <200ms |
| Search Query | <50ms | <100ms |
| Sync History | <200ms | <500ms |
| Activity Creation | <50ms | <100ms |

## Security Specifications

### Authentication & Authorization

```typescript
// Middleware for API routes
export async function requireAuth(request: NextRequest): Promise<User> {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

// RBAC check for contacts
export async function requireContactAccess(
  userId: string, 
  contactId: string
): Promise<Contact> {
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      userId: userId
    }
  });
  
  if (!contact) {
    throw new Error('Contact not found or access denied');
  }
  
  return contact;
}
```

### Data Validation

```typescript
// Contact validation schema
const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  organisation: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  warmnessScore: z.number().min(0).max(10),
  addedToCampaign: z.boolean(),
});

// Activity validation schema
const activitySchema = z.object({
  contactId: z.string().cuid(),
  type: z.enum(['EMAIL', 'MEETING_REQUEST', 'MEETING', 'LINKEDIN', 'PHONE_CALL', 'CONFERENCE']),
  subject: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  campaignId: z.string().cuid().optional(),
});
```

### API Key Security

```typescript
// Secure API key storage
export async function updatePipedriveApiKey(userId: string, apiKey: string): Promise<void> {
  // Validate API key format
  if (!apiKey.match(/^[a-f0-9]{32}$/)) {
    throw new Error('Invalid API key format');
  }
  
  // Test API key before storing
  const testResult = await testPipedriveApiKey(apiKey);
  if (!testResult.success) {
    throw new Error('Invalid API key');
  }
  
  // Encrypt and store
  const encryptedKey = await encryptApiKey(apiKey);
  await prisma.user.update({
    where: { id: userId },
    data: { pipedriveApiKey: encryptedKey }
  });
}
```

## Error Handling

### Error Types and Handling

```typescript
enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  PIPEDRIVE_API = 'PIPEDRIVE_API',
  UNKNOWN = 'UNKNOWN'
}

interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
}

class ErrorHandler {
  static handle(error: any): AppError {
    if (error instanceof PrismaClientKnownRequestError) {
      return this.handleDatabaseError(error);
    }
    
    if (error.message?.includes('rate limit')) {
      return this.handleRateLimitError(error);
    }
    
    if (error.status === 401) {
      return this.handleAuthError(error);
    }
    
    return this.handleUnknownError(error);
  }
  
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError!;
  }
}
```

### User-Friendly Error Messages

```typescript
const ERROR_MESSAGES = {
  [ErrorType.AUTHENTICATION]: 'Please log in to continue',
  [ErrorType.AUTHORIZATION]: 'You don\'t have permission to access this resource',
  [ErrorType.VALIDATION]: 'Please check your input and try again',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found',
  [ErrorType.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again',
  [ErrorType.NETWORK]: 'Network error. Please check your connection and try again',
  [ErrorType.DATABASE]: 'Database error. Please try again later',
  [ErrorType.PIPEDRIVE_API]: 'Pipedrive connection error. Please check your API key',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again'
};
```

## Testing Specifications

### Unit Tests

```typescript
// Component tests
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

// Service tests
describe('PipedriveSyncService', () => {
  it('should perform incremental sync correctly', async () => {
    const service = new PipedriveSyncService('user-1', 'api-key');
    const result = await service.incrementalSync(new Date());
    
    expect(result.successful).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
  });
});
```

### Integration Tests

```typescript
// API tests
describe('/api/my-500', () => {
  it('should return user contacts with proper sorting', async () => {
    const response = await request(app)
      .get('/api/my-500')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.contacts).toBeSortedBy('warmnessScore');
  });
  
  it('should handle search correctly', async () => {
    const response = await request(app)
      .get('/api/my-500/search?q=test@example.com')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.contacts).toHaveLength(1);
  });
});
```

### E2E Tests

```typescript
// User flow tests
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
  
  it('should sync contacts with Pipedrive', async () => {
    await page.goto('/my-500');
    await page.click('[data-testid="sync-button"]');
    
    // Wait for sync to complete
    await page.waitForSelector('[data-testid="sync-success"]');
    
    const syncStatus = await page.textContent('[data-testid="sync-status"]');
    expect(syncStatus).toContain('Synced successfully');
  });
});
```

## Deployment Specifications

### Environment Configuration

```bash
# Required environment variables
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# Pipedrive configuration
PIPEDRIVE_API_URL=https://api.pipedrive.com/v1
PIPEDRIVE_RATE_LIMIT=100
PIPEDRIVE_RATE_LIMIT_WINDOW=10

# Application configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.pipedriven.com

# Monitoring
SENTRY_DSN=...
ANALYTICS_ID=...
```

### Build Configuration

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@prisma/client": "^5.0.0",
    "next-auth": "^4.0.0",
    "zod": "^3.0.0",
    "react-query": "^3.0.0",
    "react-window": "^1.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@playwright/test": "^1.0.0",
    "eslint": "^8.0.0"
  }
}
```

### Monitoring and Logging

```typescript
// Performance monitoring
export function trackPerformance(operation: string, duration: number) {
  analytics.track('performance', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
  });
}

// Error tracking
export function trackError(error: Error, context: any) {
  analytics.track('error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

// User analytics
export function trackUserAction(action: string, data: any) {
  analytics.track('user_action', {
    action,
    data,
    timestamp: new Date().toISOString(),
  });
}
```

This technical specification provides a comprehensive foundation for implementing the My-500 screen with all necessary details for development, testing, and deployment.

---

## Sync Features

### Current Implementation Status

#### ✅ Completed Features
- **Robust Sync State Management**: Tracks sync status (`COMPLETED`, `IN_PROGRESS`, `FAILED`)
- **Force Full Sync Logic**: Automatically forces full sync when previous sync was interrupted
- **Enhanced Error Handling**: Collects and displays detailed error messages
- **Sync Status Warnings**: UI warnings for interrupted syncs
- **Force Full Sync Button**: Manual option to force full sync

#### 🚀 Planned Advanced Features
- **Real-Time Progress Updates**: Server-Sent Events for live progress
- **Batch Processing**: Process contacts in configurable batches
- **Safety Features**: Timeout protection, rate limiting, cancellation
- **Enhanced UI**: Progress bars, detailed status indicators

### Detailed Specifications

For comprehensive sync feature specifications, see:
- [My-500 Advanced Sync Features Specification](./My-500-Sync-Advanced-Features-Specification.md)

### Testing Strategy

#### Unit Tests
- Sync state management logic
- Force full sync conditions
- Error handling and collection
- Batch processing logic

#### Integration Tests
- End-to-end sync with progress updates
- Sync cancellation and recovery
- Large dataset performance
- Rate limiting compliance

#### Performance Tests
- 1000+ contact sync performance
- UI responsiveness during sync
- Memory usage optimization
- Network efficiency 