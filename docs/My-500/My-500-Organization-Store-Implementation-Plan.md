# My-500 Organization Store Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for the organization store and performance optimizations for the My-500 feature. The plan addresses the critical performance issues identified and implements the organization normalization strategy.

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Performance Optimization](#phase-1-performance-optimization)
3. [Phase 2: Organization Store](#phase-2-organization-store)
4. [Phase 3: Warmness Score Algorithm](#phase-3-warmness-score-algorithm)
5. [Phase 4: Integration & Testing](#phase-4-integration--testing)
6. [Rollout Strategy](#rollout-strategy)
7. [Risk Mitigation](#risk-mitigation)
8. [Success Criteria](#success-criteria)

## Implementation Overview

### Goals
1. **Reduce response times** from 1156ms to under 200ms
2. **Eliminate N+1 queries** and redundant database calls
3. **Implement organization normalization** for better data consistency
4. **Add warmness score calculation** for contact prioritization
5. **Improve user experience** with faster loading and better data quality

### Timeline
- **Total Duration**: 4 weeks
- **Phase 1**: Performance Optimization (Week 1)
- **Phase 2**: Organization Store (Week 2)
- **Phase 3**: Warmness Score (Week 3)
- **Phase 4**: Integration & Testing (Week 4)

## Phase 1: Performance Optimization

### Day 1: Database Indexing & Query Optimization

#### 1.1 Add Performance Indexes
```sql
-- Contact query optimization
CREATE INDEX CONCURRENTLY idx_contacts_user_priority 
ON contacts(userId, addedToCampaign DESC, warmnessScore ASC, lastContacted ASC);

CREATE INDEX CONCURRENTLY idx_contacts_organization 
ON contacts(organizationId);

CREATE INDEX CONCURRENTLY idx_contacts_search 
ON contacts(userId, name, email) USING gin(to_tsvector('english', name || ' ' || COALESCE(email, '')));

-- Activity optimization
CREATE INDEX CONCURRENTLY idx_activities_contact_created 
ON activities(contactId, createdAt DESC);

CREATE INDEX CONCURRENTLY idx_activities_user_type 
ON activities(userId, type);

-- User optimization
CREATE INDEX CONCURRENTLY idx_users_email 
ON users(email);
```

#### 1.2 Optimize My-500 Query
```typescript
// BEFORE: Multiple queries causing N+1 problem
export async function getMy500Data(userId: string, page: number = 1, limit: number = 20) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: [
      { addedToCampaign: 'desc' },
      { warmnessScore: 'asc' },
      { lastContacted: 'asc' },
      { createdAt: 'desc' }
    ],
    skip: (page - 1) * limit,
    take: limit
  });

  // N+1 problem: fetching activities separately
  const contactsWithActivities = await Promise.all(
    contacts.map(async (contact) => ({
      ...contact,
      activities: await prisma.activity.findMany({
        where: { contactId: contact.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    }))
  );

  return contactsWithActivities;
}

// AFTER: Single optimized query
export async function getMy500Data(userId: string, page: number = 1, limit: number = 20) {
  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
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

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}
```

#### 1.3 Add Query Performance Monitoring
```typescript
// Add to lib/prisma.ts
export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  const duration = e.duration;
  if (duration > 100) { // Log slow queries
    console.warn(`Slow query detected: ${e.query} (${duration}ms)`);
  }
  
  // Track query performance
  trackQueryPerformance(e.query, duration);
});
```

### Day 2: Caching Implementation

#### 2.1 Set Up Redis Caching
```typescript
// lib/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Cache utilities
export class ContactCache {
  private static CACHE_TTL = 300; // 5 minutes
  
  static async getContacts(userId: string, page: number, limit: number): Promise<any> {
    const key = `contacts:${userId}:${page}:${limit}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }
  
  static async setContacts(userId: string, page: number, limit: number, data: any): Promise<void> {
    const key = `contacts:${userId}:${page}:${limit}`;
    await redis.setex(key, this.CACHE_TTL, JSON.stringify(data));
  }
  
  static async invalidateUserContacts(userId: string): Promise<void> {
    const keys = await redis.keys(`contacts:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

#### 2.2 Implement React Query Caching
```typescript
// hooks/useMy500Contacts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMy500Contacts(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['my500', 'contacts', page, limit],
    queryFn: () => fetchMy500Contacts(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
}

export function useSyncContacts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: syncContacts,
    onSuccess: () => {
      // Invalidate all contact queries
      queryClient.invalidateQueries(['my500', 'contacts']);
    },
  });
}
```

### Day 3: Authentication Optimization

#### 3.1 Optimize Session Handling
```typescript
// lib/auth-utils.ts
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

// Update auth callbacks to use caching
export const authOptions: NextAuthOptions = {
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      
      if (token.userId) {
        const cachedUser = await getCachedUser(token.userId);
        if (cachedUser) {
          token.user = cachedUser;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = token.user;
      }
      return session;
    },
  },
};
```

### Day 4-5: Performance Testing & Monitoring

#### 4.1 Add Performance Monitoring
```typescript
// lib/performance.ts
export function trackPerformance(operation: string, duration: number, metadata?: any) {
  console.log(`Performance: ${operation} took ${duration}ms`, metadata);
  
  // Send to analytics
  analytics.track('performance', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

// Add to API routes
export async function withPerformanceTracking<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    trackPerformance(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    trackPerformance(`${operation}_error`, duration, { error: error.message });
    throw error;
  }
}
```

## Phase 2: Organization Store

### Day 1: Database Schema

#### 2.1 Create Organization Table
```sql
-- Create organizations table
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

-- Add indexes
CREATE INDEX idx_organizations_name ON organizations(normalizedName);
CREATE INDEX idx_organizations_pipedrive ON organizations(pipedriveOrgId);
CREATE INDEX idx_organizations_contact_count ON organizations(contactCount DESC);

-- Update contacts table
ALTER TABLE contacts ADD COLUMN organizationId TEXT REFERENCES organizations(id);
CREATE INDEX idx_contacts_organization ON contacts(organizationId);
```

#### 2.2 Update Prisma Schema
```prisma
// prisma/schema.prisma
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

### Day 2: Organization Service

#### 2.1 Create Organization Service
```typescript
// server/services/organizationService.ts
export class OrganizationService {
  static async findOrCreateOrganization(orgData: {
    name: string;
    pipedriveOrgId?: string;
    industry?: string;
    size?: string;
    website?: string;
    address?: string;
    country?: string;
    city?: string;
  }): Promise<Organization> {
    const normalizedName = this.normalizeOrganizationName(orgData.name);
    
    // Try to find existing organization
    const existing = await prisma.organization.findFirst({
      where: {
        OR: [
          { pipedriveOrgId: orgData.pipedriveOrgId },
          { normalizedName }
        ]
      }
    });
    
    if (existing) {
      // Update if we have new information
      if (orgData.pipedriveOrgId && !existing.pipedriveOrgId) {
        return await prisma.organization.update({
          where: { id: existing.id },
          data: { pipedriveOrgId: orgData.pipedriveOrgId }
        });
      }
      return existing;
    }
    
    // Create new organization
    return await prisma.organization.create({
      data: {
        name: orgData.name,
        normalizedName,
        pipedriveOrgId: orgData.pipedriveOrgId,
        industry: orgData.industry,
        size: orgData.size,
        website: orgData.website,
        address: orgData.address,
        country: orgData.country,
        city: orgData.city
      }
    });
  }
  
  static normalizeOrganizationName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }
  
  static async updateOrganizationStats(organizationId: string): Promise<void> {
    const [contactCount, lastActivity] = await Promise.all([
      prisma.contact.count({
        where: { organizationId }
      }),
      prisma.activity.findFirst({
        where: {
          contact: { organizationId }
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);
    
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        contactCount,
        lastActivity: lastActivity?.createdAt
      }
    });
  }
}
```

### Day 3: Organization API Endpoints

#### 3.1 Create Organization API Routes
```typescript
// app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrganizationService } from '@/server/services/organizationService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    
    const where = {
      contacts: {
        some: { userId: session.user.id }
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { normalizedName: { contains: search.toLowerCase() } }
        ]
      })
    };
    
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: { contacts: true }
          }
        },
        orderBy: { contactCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.organization.count({ where })
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const organization = await OrganizationService.findOrCreateOrganization(body);
    
    return NextResponse.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
```

### Day 4-5: Organization Integration

#### 4.1 Update Sync Service
```typescript
// server/services/pipedriveService.ts
export class PipedriveService {
  async syncContactsWithOrganizations(userId: string, apiKey: string): Promise<SyncResult> {
    const pipedriveContacts = await this.fetchContacts(apiKey);
    const organizations = new Map<string, Organization>();
    
    // Process organizations first
    for (const contact of pipedriveContacts) {
      if (contact.org_id) {
        const orgKey = contact.org_id.toString();
        if (!organizations.has(orgKey)) {
          const organization = await OrganizationService.findOrCreateOrganization({
            name: contact.org_name || 'Unknown Organization',
            pipedriveOrgId: orgKey
          });
          organizations.set(orgKey, organization);
        }
      }
    }
    
    // Process contacts with organization mapping
    const results = await Promise.allSettled(
      pipedriveContacts.map(contact => 
        this.processContactWithOrganization(contact, organizations, userId)
      )
    );
    
    return this.aggregateResults(results);
  }
  
  private async processContactWithOrganization(
    pipedriveContact: PipedriveContact,
    organizations: Map<string, Organization>,
    userId: string
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
      warmnessScore: await this.calculateWarmnessScore(pipedriveContact),
      userId
    };
    
    return await this.upsertContact(contactData);
  }
}
```

## Phase 3: Warmness Score Algorithm

### Day 1: Score Calculation Logic

#### 3.1 Create Warmness Score Calculator
```typescript
// server/services/warmnessScoreService.ts
export class WarmnessScoreService {
  static async calculateScore(contact: PipedriveContact): Promise<number> {
    let score = 0;
    
    // Base score from contact data
    score += this.getBaseScore(contact);
    
    // Activity-based scoring
    score += await this.getActivityScore(contact);
    
    // Relationship scoring
    score += await this.getRelationshipScore(contact);
    
    // Engagement scoring
    score += this.getEngagementScore(contact);
    
    return Math.min(Math.max(score, 0), 10); // Clamp between 0-10
  }
  
  private static getBaseScore(contact: PipedriveContact): number {
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
  
  private static async getActivityScore(contact: PipedriveContact): Promise<number> {
    let score = 0;
    
    // Get recent activities from Pipedrive
    const recentActivities = await this.fetchRecentActivities(contact.id);
    
    // Activity count (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCount = recentActivities.filter(
      activity => new Date(activity.due_date) > thirtyDaysAgo
    ).length;
    
    score += Math.min(recentCount, 3); // Max 3 points for recent activities
    
    // Activity types
    const activityTypes = new Set(recentActivities.map(a => a.type));
    if (activityTypes.has('meeting')) score += 2;
    if (activityTypes.has('call')) score += 1;
    if (activityTypes.has('email')) score += 1;
    
    return score;
  }
  
  private static async getRelationshipScore(contact: PipedriveContact): Promise<number> {
    let score = 0;
    
    // Deal value (if available)
    const deals = await this.fetchContactDeals(contact.id);
    if (deals.length > 0) {
      const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
      if (totalValue > 10000) score += 2;
      else if (totalValue > 1000) score += 1;
    }
    
    // Lead status
    if (contact.lead_status === 'qualified') score += 1;
    if (contact.lead_status === 'contacted') score += 1;
    
    return score;
  }
  
  private static getEngagementScore(contact: PipedriveContact): number {
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

### Day 2: Score Integration

#### 3.2 Integrate Score Calculation in Sync
```typescript
// Update sync service to include warmness score calculation
export class PipedriveService {
  async syncContactsWithScores(userId: string, apiKey: string): Promise<SyncResult> {
    const pipedriveContacts = await this.fetchContacts(apiKey);
    
    const results = await Promise.allSettled(
      pipedriveContacts.map(async (contact) => {
        const warmnessScore = await WarmnessScoreService.calculateScore(contact);
        
        return await this.upsertContact({
          ...this.mapPipedriveContact(contact),
          warmnessScore,
          userId
        });
      })
    );
    
    return this.aggregateResults(results);
  }
}
```

### Day 3: Score Updates on Activities

#### 3.3 Activity-Based Score Updates
```typescript
// Update activity creation to recalculate scores
export class ActivityService {
  static async createActivity(data: CreateActivityData): Promise<Activity> {
    const activity = await prisma.activity.create({
      data: {
        ...data,
        userId: session.user.id
      }
    });
    
    // Update contact's last contacted date
    await prisma.contact.update({
      where: { id: data.contactId },
      data: { lastContacted: new Date() }
    });
    
    // Recalculate warmness score
    await this.updateContactWarmnessScore(data.contactId);
    
    return activity;
  }
  
  private static async updateContactWarmnessScore(contactId: string): Promise<void> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!contact) return;
    
    const newScore = await WarmnessScoreService.calculateScoreFromLocal(contact);
    
    await prisma.contact.update({
      where: { id: contactId },
      data: { warmnessScore: newScore }
    });
  }
}
```

## Phase 4: Integration & Testing

### Day 1: UI Updates

#### 4.1 Update Contact Cards
```typescript
// components/contacts/ContactCard.tsx
export function ContactCard({ contact, onAction, onSelect }: ContactCardProps) {
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
            <WarmnessScoreBadge score={contact.warmnessScore} />
            {contact.organization && (
              <OrganizationBadge organization={contact.organization} />
            )}
          </div>
          
          <div className="text-sm text-gray-500 mt-1">
            {contact.organization && (
              <span className="mr-2">{contact.organization.name}</span>
            )}
            {contact.email && (
              <span>{contact.email}</span>
            )}
          </div>
          
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

### Day 2: Organization Filters

#### 4.2 Add Organization Filtering
```typescript
// components/contacts/ContactFilters.tsx
export function ContactFilters({ filters, onFilterChange }: ContactFiltersProps) {
  const { data: organizations } = useOrganizations();
  
  return (
    <div className="flex gap-4 mb-6">
      <Select
        value={filters.organizationId || ''}
        onChange={(value) => onFilterChange({ ...filters, organizationId: value })}
        placeholder="Filter by organization"
      >
        <option value="">All Organizations</option>
        {organizations?.map(org => (
          <option key={org.id} value={org.id}>
            {org.name} ({org.contactCount})
          </option>
        ))}
      </Select>
      
      <Select
        value={filters.warmnessScore || ''}
        onChange={(value) => onFilterChange({ ...filters, warmnessScore: value })}
        placeholder="Filter by warmness"
      >
        <option value="">All Warmness Levels</option>
        <option value="0-3">Cold (0-3)</option>
        <option value="4-6">Warm (4-6)</option>
        <option value="7-10">Hot (7-10)</option>
      </Select>
    </div>
  );
}
```

### Day 3-4: Performance Testing

#### 4.3 Comprehensive Testing
```typescript
// __tests__/performance/my500-performance.test.ts
describe('My-500 Performance Tests', () => {
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
  
  it('should handle organization filtering efficiently', async () => {
    const response = await request(app)
      .get('/api/my-500?organizationId=org-123')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.performance.queryTime).toBeLessThan(200);
  });
});
```

### Day 5: Documentation & Monitoring

#### 4.4 Add Monitoring
```typescript
// lib/monitoring.ts
export function trackMy500Performance(operation: string, duration: number, metadata?: any) {
  analytics.track('my500_performance', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString(),
  });
  
  // Alert on slow operations
  if (duration > 2000) {
    console.error(`Slow My-500 operation: ${operation} took ${duration}ms`, metadata);
  }
}

export function trackOrganizationMetrics(organizationId: string, action: string) {
  analytics.track('organization_action', {
    organizationId,
    action,
    timestamp: new Date().toISOString(),
  });
}

export function trackWarmnessScoreUpdate(contactId: string, oldScore: number, newScore: number) {
  analytics.track('warmness_score_update', {
    contactId,
    oldScore,
    newScore,
    change: newScore - oldScore,
    timestamp: new Date().toISOString(),
  });
}
```

## Organization Store Implementation Update

- Contact creation now features an organization autocomplete/search field.
- The field searches both local and Pipedrive organizations as the user types.
- If no match is found, the user can create a new organization inline.
- The contact is linked to the selected or newly created organization via `organizationId`.
- This ensures deduplication and proper linking of contacts to organizations.

## Rollout Strategy

### Phase 1: Performance Rollout (Week 1)
1. **Deploy database indexes** during low-traffic period
2. **Enable caching** with monitoring
3. **Monitor performance** for 24 hours
4. **Rollback plan** if issues arise

### Phase 2: Organization Store Rollout (Week 2)
1. **Deploy organization schema** with migration
2. **Run organization sync** for existing data
3. **Test organization features** in staging
4. **Gradual rollout** to production

### Phase 3: Warmness Score Rollout (Week 3)
1. **Deploy score calculation** in background
2. **Calculate scores** for existing contacts
3. **Enable score-based sorting** by default
4. **Monitor score accuracy** and user feedback

### Phase 4: Full Integration (Week 4)
1. **Enable all features** together
2. **Monitor system performance** closely
3. **Gather user feedback** and iterate
4. **Document lessons learned**

## Risk Mitigation

### Performance Risks
- **Database migration issues**: Use `CONCURRENTLY` indexes and test on staging
- **Cache invalidation problems**: Implement proper cache keys and TTL
- **Memory leaks**: Monitor memory usage and implement cleanup

### Data Risks
- **Organization matching errors**: Implement fuzzy matching and manual review
- **Score calculation errors**: Add validation and fallback scores
- **Sync conflicts**: Implement conflict resolution strategies

### User Experience Risks
- **Slow loading times**: Implement progressive loading and skeleton screens
- **Data inconsistency**: Add data validation and error handling
- **Feature confusion**: Provide clear documentation and onboarding

## Success Criteria

### Performance Targets
- **Initial load time**: <2 seconds for 500 contacts
- **Search response time**: <200ms
- **Cache hit rate**: >80%
- **Database query time**: <100ms average

### Business Metrics
- **Organization coverage**: >90% of contacts have organizations
- **Warmness score accuracy**: >85% user satisfaction
- **User engagement**: Increased time on My-500 page
- **Sync success rate**: >95%

### Technical Metrics
- **Error rate**: <1% of requests
- **Uptime**: >99.9%
- **Memory usage**: <100MB for contact list
- **API response times**: <500ms for all endpoints

This implementation plan provides a comprehensive roadmap for delivering the organization store and performance optimizations while maintaining system stability and user experience. 