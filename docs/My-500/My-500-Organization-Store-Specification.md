# My-500 Organization Store & Performance Optimization Specification

## Overview

This document specifies the implementation of an internal organization store within Pipedriven to normalize organization data and addresses critical performance issues identified in the current My-500 implementation.

## Table of Contents

1. [Current Performance Issues](#current-performance-issues)
2. [Organization Store Architecture](#organization-store-architecture)
3. [Performance Optimization Strategy](#performance-optimization-strategy)
4. [Database Schema Updates](#database-schema-updates)
5. [API Design](#api-design)
6. [Sync Strategy](#sync-strategy)
7. [Warmness Score Algorithm](#warmness-score-algorithm)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring & Metrics](#monitoring--metrics)

## Current Performance Issues

### Identified Problems

#### 1. Database Query Performance
- **N+1 Query Problem**: Activities fetched separately for each contact
- **Redundant Queries**: Same queries executed multiple times
- **Missing Indexes**: No proper indexing for common query patterns
- **Slow Response Times**: Some requests taking 1156ms

#### 2. Authentication Overhead
- **Repeated JWT Callbacks**: Authentication checks running multiple times per request
- **Database Round Trips**: User data fetched repeatedly
- **Session Validation**: Unnecessary session revalidation

#### 3. Organization Data Issues
- **Inconsistent Storage**: Organization data stored as strings instead of normalized entities
- **Missing Relationships**: No proper organization-contact relationships
- **Sync Failures**: Organization ID handling causing sync errors

#### 4. Warmness Score Problems
- **No Calculation**: Warmness scores not calculated for new contacts
- **Missing Algorithm**: No defined algorithm for score calculation
- **No Updates**: Scores not updated based on activities

## Organization Store Architecture

### Core Concept

Create an internal organization store that:
- **Normalizes** organization data across all users
- **Maintains** internal UUIDs for processing
- **Maps** to Pipedrive organization IDs when available
- **Enables** organization-based analytics and filtering

### Organization Model Design

```typescript
interface Organization {
  // Internal Identification
  id: string;                    // Internal UUID (cuid)
  name: string;                  // Organization name
  normalizedName: string;        // Normalized name for matching
  
  // External Mapping
  pipedriveOrgId?: string;       // Pipedrive organization ID (if exists)
  
  // Organization Details
  industry?: string;             // Industry/sector
  size?: string;                 // Company size (1-10, 11-50, etc.)
  website?: string;              // Website URL
  address?: string;              // Address information
  country?: string;              // Country
  city?: string;                 // City
  
  // Metadata
  contactCount: number;          // Number of contacts in this organization
  lastActivity?: Date;           // Last activity with any contact in org
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  contacts: Contact[];           // All contacts in this organization
}
```

### Contact Model Updates

```typescript
interface Contact {
  // ... existing fields ...
  
  // Organization Relationship
  organizationId?: string;       // Reference to Organization table
  organization?: Organization;   // Populated relation
  
  // Remove old organization field
  // organisation?: string;      // DEPRECATED - remove this
  
  // ... rest of existing fields ...
}
```

## Performance Optimization Strategy

### 1. Database Query Optimization

#### Eliminate N+1 Queries
```typescript
// BEFORE: N+1 query problem
const contacts = await prisma.contact.findMany({
  where: { userId: session.user.id }
});
// Then for each contact, fetch activities separately

// AFTER: Single optimized query
const contacts = await prisma.contact.findMany({
  where: { userId: session.user.id },
  include: {
    activities: {
      orderBy: { createdAt: 'desc' },
      take: 5 // Limit recent activities
    },
    organization: true
  },
  orderBy: [
    { addedToCampaign: 'desc' },
    { warmnessScore: 'asc' },
    { lastContacted: 'asc' },
    { createdAt: 'desc' }
  ]
});
```

#### Add Performance Indexes
```sql
-- Contact query optimization
CREATE INDEX idx_contacts_user_priority ON contacts(userId, addedToCampaign DESC, warmnessScore ASC, lastContacted ASC);
CREATE INDEX idx_contacts_organization ON contacts(organizationId);
CREATE INDEX idx_contacts_search ON contacts(userId, name, email) USING gin(to_tsvector('english', name || ' ' || COALESCE(email, '')));

-- Activity optimization
CREATE INDEX idx_activities_contact_created ON activities(contactId, createdAt DESC);
CREATE INDEX idx_activities_user_type ON activities(userId, type);

-- Organization optimization
CREATE INDEX idx_organizations_name ON organizations(normalizedName);
CREATE INDEX idx_organizations_pipedrive ON organizations(pipedriveOrgId);
```

### 2. Caching Strategy

#### React Query Implementation
```typescript
// Contact list caching
export function useMy500Contacts(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['my500', 'contacts', page, limit],
    queryFn: () => fetchMy500Contacts(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Keep previous data while loading new page
  });
}

// Organization caching
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => fetchOrganizations(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
}
```

#### Server-Side Caching
```typescript
// Redis caching for frequently accessed data
export class ContactCache {
  private redis: Redis;
  
  async getContacts(userId: string, page: number, limit: number): Promise<Contact[]> {
    const key = `contacts:${userId}:${page}:${limit}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const contacts = await this.fetchContactsFromDB(userId, page, limit);
    await this.redis.setex(key, 300, JSON.stringify(contacts)); // 5 minutes
    
    return contacts;
  }
}
```

### 3. Authentication Optimization

#### Session Caching
```typescript
// Cache user session data
export async function getCachedUser(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pipedriveApiKey: true,
      lastSyncTimestamp: true,
      syncStatus: true
    }
  });
  
  if (user) {
    await redis.setex(cacheKey, 600, JSON.stringify(user)); // 10 minutes
  }
  
  return user;
}
```

## Database Schema Updates

### New Organization Table
```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalizedName TEXT NOT NULL,
  pipedriveOrgId TEXT UNIQUE,
  industry TEXT,
  size TEXT,
  website TEXT,
  address TEXT,
  country TEXT,
  city TEXT,
  contactCount INTEGER DEFAULT 0,
  lastActivity TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_organizations_name ON organizations(normalizedName);
CREATE INDEX idx_organizations_pipedrive ON organizations(pipedriveOrgId);
CREATE INDEX idx_organizations_contact_count ON organizations(contactCount DESC);
```

### Updated Contact Table
```sql
-- Add organization relationship
ALTER TABLE contacts ADD COLUMN organizationId TEXT REFERENCES organizations(id);

-- Remove old organization field (after migration)
-- ALTER TABLE contacts DROP COLUMN organisation;

-- Update indexes
CREATE INDEX idx_contacts_organization ON contacts(organizationId);
CREATE INDEX idx_contacts_user_priority ON contacts(userId, addedToCampaign DESC, warmnessScore ASC, lastContacted ASC);
```

### Prisma Schema Updates
```prisma
model Organization {
  id              String   @id @default(cuid())
  name            String
  normalizedName  String
  pipedriveOrgId  String?  @unique
  industry        String?
  size            String?
  website         String?
  address         String?
  country         String?
  city            String?
  contactCount    Int      @default(0)
  lastActivity    DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  contacts        Contact[]

  @@map("organizations")
}

model Contact {
  id                   String        @id @default(cuid())
  name                 String
  email                String?
  phone                String?
  // organisation        String?      // DEPRECATED - remove after migration
  organizationId       String?
  warmnessScore        Int           @default(0)
  lastContacted        DateTime?
  addedToCampaign      Boolean       @default(false)
  pipedrivePersonId    String?
  pipedriveOrgId       String?
  lastPipedriveUpdate  DateTime?
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  userId               String
  user                 User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization         Organization? @relation(fields: [organizationId], references: [id])

  // Relations
  activities           Activity[]

  @@map("contacts")
}
```

## API Design

### Optimized My-500 Endpoint
```typescript
// GET /api/my-500
interface My500Response {
  success: boolean;
  data: {
    contacts: ContactWithActivitiesAndOrganization[];
    pagination: PaginationInfo;
    syncStatus: SyncStatus;
    performance: {
      queryTime: number;
      cacheHit: boolean;
      totalTime: number;
    };
  };
}

// Optimized query implementation
export async function getMy500Data(userId: string, page: number = 1, limit: number = 20) {
  const startTime = Date.now();
  
  // Check cache first
  const cacheKey = `my500:${userId}:${page}:${limit}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return {
      ...JSON.parse(cached),
      performance: {
        queryTime: 0,
        cacheHit: true,
        totalTime: Date.now() - startTime
      }
    };
  }
  
  // Optimized database query
  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        organization: true
      },
      orderBy: [
        { addedToCampaign: 'desc' },
        { warmnessScore: 'asc' },
        { lastContacted: 'asc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.contact.count({ where: { userId } })
  ]);
  
  const result = {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    },
    syncStatus: await getSyncStatus(userId)
  };
  
  // Cache result
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  
  return {
    ...result,
    performance: {
      queryTime: Date.now() - startTime,
      cacheHit: false,
      totalTime: Date.now() - startTime
    }
  };
}
```

### Organization Management Endpoints
```typescript
// GET /api/organizations
export async function getOrganizations(userId: string) {
  return await prisma.organization.findMany({
    where: {
      contacts: {
        some: { userId }
      }
    },
    include: {
      _count: {
        select: { contacts: true }
      }
    },
    orderBy: { contactCount: 'desc' }
  });
}

// POST /api/organizations
export async function createOrganization(data: CreateOrganizationData) {
  const normalizedName = normalizeOrganizationName(data.name);
  
  return await prisma.organization.create({
    data: {
      ...data,
      normalizedName
    }
  });
}
```

## Sync Strategy

### Organization-Aware Sync
```typescript
export class OrganizationAwareSyncService {
  async syncContacts(userId: string, apiKey: string): Promise<SyncResult> {
    const pipedriveContacts = await this.fetchPipedriveContacts(apiKey);
    const organizations = await this.processOrganizations(pipedriveContacts);
    
    // Process contacts with organization mapping
    const results = await Promise.allSettled(
      pipedriveContacts.map(contact => this.processContactWithOrganization(contact, organizations))
    );
    
    return this.aggregateResults(results);
  }
  
  private async processOrganizations(contacts: PipedriveContact[]): Promise<Map<string, Organization>> {
    const orgMap = new Map<string, Organization>();
    const uniqueOrgs = new Set(
      contacts
        .filter(c => c.org_id)
        .map(c => ({ id: c.org_id, name: c.org_name }))
    );
    
    for (const org of uniqueOrgs) {
      const existing = await prisma.organization.findFirst({
        where: {
          OR: [
            { pipedriveOrgId: org.id.toString() },
            { normalizedName: normalizeOrganizationName(org.name) }
          ]
        }
      });
      
      if (existing) {
        orgMap.set(org.id.toString(), existing);
      } else {
        const newOrg = await prisma.organization.create({
          data: {
            name: org.name,
            normalizedName: normalizeOrganizationName(org.name),
            pipedriveOrgId: org.id.toString()
          }
        });
        orgMap.set(org.id.toString(), newOrg);
      }
    }
    
    return orgMap;
  }
  
  private async processContactWithOrganization(
    pipedriveContact: PipedriveContact, 
    organizations: Map<string, Organization>
  ): Promise<Contact> {
    const organization = pipedriveContact.org_id 
      ? organizations.get(pipedriveContact.org_id.toString())
      : null;
    
    const contactData = {
      name: pipedriveContact.name,
      email: this.getPrimaryEmail(pipedriveContact),
      phone: this.getPrimaryPhone(pipedriveContact),
      organizationId: organization?.id,
      pipedrivePersonId: pipedriveContact.id.toString(),
      pipedriveOrgId: pipedriveContact.org_id?.toString(),
      lastPipedriveUpdate: new Date(pipedriveContact.update_time),
      warmnessScore: this.calculateWarmnessScore(pipedriveContact),
      userId: session.user.id
    };
    
    return await this.upsertContact(contactData);
  }
}
```

## Warmness Score Algorithm

### Score Calculation Logic
```typescript
export class WarmnessScoreCalculator {
  calculateScore(contact: PipedriveContact): number {
    let score = 0;
    
    // Base score from Pipedrive data
    score += this.getBaseScore(contact);
    
    // Activity-based scoring
    score += this.getActivityScore(contact);
    
    // Relationship scoring
    score += this.getRelationshipScore(contact);
    
    // Engagement scoring
    score += this.getEngagementScore(contact);
    
    return Math.min(Math.max(score, 0), 10); // Clamp between 0-10
  }
  
  private getBaseScore(contact: PipedriveContact): number {
    let score = 0;
    
    // Email presence
    if (contact.email?.length > 0) score += 1;
    
    // Phone presence
    if (contact.phone?.length > 0) score += 1;
    
    // Organization presence
    if (contact.org_id) score += 1;
    
    // Job title presence
    if (contact.title) score += 1;
    
    return score;
  }
  
  private getActivityScore(contact: PipedriveContact): number {
    let score = 0;
    
    // Recent activities (last 30 days)
    const recentActivities = contact.activities?.filter(
      activity => new Date(activity.due_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) || [];
    
    score += Math.min(recentActivities.length, 3); // Max 3 points for recent activities
    
    // Activity types
    const activityTypes = new Set(recentActivities.map(a => a.type));
    if (activityTypes.has('meeting')) score += 2;
    if (activityTypes.has('call')) score += 1;
    if (activityTypes.has('email')) score += 1;
    
    return score;
  }
  
  private getRelationshipScore(contact: PipedriveContact): number {
    let score = 0;
    
    // Deal value (if available)
    if (contact.deals?.length > 0) {
      const totalValue = contact.deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
      if (totalValue > 10000) score += 2;
      else if (totalValue > 1000) score += 1;
    }
    
    // Lead status
    if (contact.lead_status === 'qualified') score += 1;
    if (contact.lead_status === 'contacted') score += 1;
    
    return score;
  }
  
  private getEngagementScore(contact: PipedriveContact): number {
    let score = 0;
    
    // Last contact recency
    if (contact.last_activity_date) {
      const daysSinceLastActivity = (Date.now() - new Date(contact.last_activity_date).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastActivity < 7) score += 2;
      else if (daysSinceLastActivity < 30) score += 1;
      else if (daysSinceLastActivity > 90) score -= 1;
    }
    
    // Response rate (if available)
    if (contact.response_rate && contact.response_rate > 0.5) score += 1;
    
    return score;
  }
}
```

## Implementation Phases

### Phase 1: Performance Optimization (Week 1)

#### Day 1-2: Database Optimization
- [ ] Add performance indexes
- [ ] Optimize existing queries
- [ ] Implement query monitoring
- [ ] Add database connection pooling

#### Day 3-4: Caching Implementation
- [ ] Set up Redis caching
- [ ] Implement React Query caching
- [ ] Add cache invalidation logic
- [ ] Implement cache monitoring

#### Day 5: Authentication Optimization
- [ ] Optimize session handling
- [ ] Implement user caching
- [ ] Reduce authentication overhead
- [ ] Add performance monitoring

### Phase 2: Organization Store (Week 2)

#### Day 1-2: Database Schema
- [ ] Create Organization table
- [ ] Update Contact table
- [ ] Create migration scripts
- [ ] Add organization indexes

#### Day 3-4: Organization Service
- [ ] Implement organization service
- [ ] Add organization matching logic
- [ ] Create organization API endpoints
- [ ] Add organization validation

#### Day 5: Sync Integration
- [ ] Update sync service for organizations
- [ ] Implement organization-aware sync
- [ ] Add organization conflict resolution
- [ ] Test organization sync

### Phase 3: Warmness Score (Week 3)

#### Day 1-2: Score Algorithm
- [ ] Implement warmness score calculator
- [ ] Add score calculation logic
- [ ] Create score update triggers
- [ ] Add score validation

#### Day 3-4: Score Integration
- [ ] Integrate score calculation in sync
- [ ] Add score-based sorting
- [ ] Implement score updates on activities
- [ ] Add score analytics

#### Day 5: Testing & Optimization
- [ ] Test score accuracy
- [ ] Optimize score calculation
- [ ] Add score monitoring
- [ ] Performance testing

### Phase 4: UI Updates & Polish (Week 4)

#### Day 1-2: Organization UI
- [ ] Update contact cards for organizations
- [ ] Add organization filters
- [ ] Implement organization search
- [ ] Add organization analytics

#### Day 3-4: Performance UI
- [ ] Add loading states
- [ ] Implement virtual scrolling
- [ ] Add performance indicators
- [ ] Optimize mobile experience

#### Day 5: Testing & Documentation
- [ ] Comprehensive testing
- [ ] Performance testing
- [ ] Update documentation
- [ ] User acceptance testing

## Testing Strategy

### Performance Testing
```typescript
describe('My-500 Performance', () => {
  it('should load 500 contacts in under 2 seconds', async () => {
    const startTime = Date.now();
    
    await page.goto('/my-500');
    await page.waitForSelector('[data-testid="contact-card"]');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });
  
  it('should cache queries effectively', async () => {
    // First request
    const response1 = await request(app)
      .get('/api/my-500')
      .set('Authorization', `Bearer ${token}`);
    
    // Second request (should be cached)
    const response2 = await request(app)
      .get('/api/my-500')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response2.body.performance.cacheHit).toBe(true);
    expect(response2.body.performance.queryTime).toBeLessThan(100);
  });
});
```

### Organization Testing
```typescript
describe('Organization Store', () => {
  it('should normalize organization names correctly', () => {
    expect(normalizeOrganizationName('Acme Corp.')).toBe('acme corp');
    expect(normalizeOrganizationName('ACME CORPORATION')).toBe('acme corporation');
    expect(normalizeOrganizationName('Acme Corp Ltd.')).toBe('acme corp ltd');
  });
  
  it('should match organizations correctly', async () => {
    const org1 = await createOrganization({ name: 'Acme Corp' });
    const org2 = await createOrganization({ name: 'ACME CORPORATION' });
    
    const match = await findOrganizationMatch('Acme Corp.');
    expect(match.id).toBe(org1.id);
  });
});
```

## Monitoring & Metrics

### Performance Metrics
```typescript
// Track query performance
export function trackQueryPerformance(operation: string, duration: number) {
  analytics.track('query_performance', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
  });
}

// Track cache performance
export function trackCachePerformance(hit: boolean, operation: string) {
  analytics.track('cache_performance', {
    hit,
    operation,
    timestamp: new Date().toISOString(),
  });
}

// Track sync performance
export function trackSyncPerformance(syncType: string, duration: number, contactsProcessed: number) {
  analytics.track('sync_performance', {
    syncType,
    duration,
    contactsProcessed,
    timestamp: new Date().toISOString(),
  });
}
```

### Success Metrics

#### Performance Targets
- **Initial Load Time**: <2 seconds for 500 contacts
- **Incremental Sync**: <1 second for changed contacts
- **Search Response**: <200ms
- **Cache Hit Rate**: >80%
- **Database Query Time**: <100ms average

#### Business Metrics
- **Organization Coverage**: >90% of contacts have organizations
- **Warmness Score Accuracy**: >85% user satisfaction
- **Sync Success Rate**: >95%
- **User Engagement**: Increased time on My-500 page

This specification provides a comprehensive roadmap for implementing the organization store and addressing the critical performance issues in the My-500 feature. 