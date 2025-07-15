# My-500 Performance Optimization Guide

## Overview

This guide addresses the critical performance issues identified in the My-500 feature, specifically the slow response times (1156ms), N+1 query problems, and redundant database calls.

## Current Performance Issues

### 1. Slow Response Times
- **Problem**: Some requests taking 1156ms
- **Root Cause**: Multiple database queries, N+1 problems, no caching
- **Impact**: Poor user experience, high server load

### 2. N+1 Query Problem
- **Problem**: Activities fetched separately for each contact
- **Root Cause**: Separate queries for contacts and activities
- **Impact**: Exponential query growth with contact count

### 3. Redundant Authentication
- **Problem**: JWT callbacks running multiple times per request
- **Root Cause**: Session revalidation on every request
- **Impact**: Unnecessary database round trips

### 4. Missing Indexes
- **Problem**: No proper indexing for common query patterns
- **Root Cause**: Database queries not optimized
- **Impact**: Slow query execution

## Immediate Fixes (Week 1)

### 1. Database Query Optimization

#### Fix N+1 Query Problem
```typescript
// BEFORE: N+1 query problem
const contacts = await prisma.contact.findMany({
  where: { userId: session.user.id }
});

// Then for each contact, fetch activities separately
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

// AFTER: Single optimized query
const contacts = await prisma.contact.findMany({
  where: { userId: session.user.id },
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
  ]
});
```

#### Add Performance Indexes
```sql
-- Contact query optimization
CREATE INDEX CONCURRENTLY idx_contacts_user_priority 
ON contacts(userId, addedToCampaign DESC, warmnessScore ASC, lastContacted ASC);

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

### 2. Caching Implementation

#### React Query Caching
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

#### Server-Side Caching
```typescript
// lib/cache.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

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

### 3. Authentication Optimization

#### Session Caching
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

// Update auth callbacks
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

## Optimized API Implementation

### My-500 Endpoint Optimization
```typescript
// app/api/my-500/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContactCache } from '@/lib/cache';
import { trackPerformance } from '@/lib/performance';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Check cache first
    const cacheKey = `my500:${session.user.id}:${page}:${limit}`;
    const cached = await ContactCache.getContacts(session.user.id, page, limit);
    
    if (cached) {
      trackPerformance('my500_cache_hit', Date.now() - startTime);
      return NextResponse.json({
        success: true,
        data: cached,
        performance: {
          queryTime: 0,
          cacheHit: true,
          totalTime: Date.now() - startTime
        }
      });
    }
    
    // Optimized database query
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: { userId: session.user.id },
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
      prisma.contact.count({ where: { userId: session.user.id } })
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
      syncStatus: await getSyncStatus(session.user.id)
    };
    
    // Cache result
    await ContactCache.setContacts(session.user.id, page, limit, result);
    
    trackPerformance('my500_query', Date.now() - startTime);
    
    return NextResponse.json({
      success: true,
      data: result,
      performance: {
        queryTime: Date.now() - startTime,
        cacheHit: false,
        totalTime: Date.now() - startTime
      }
    });
  } catch (error) {
    console.error('Error fetching My-500 data:', error);
    trackPerformance('my500_error', Date.now() - startTime, { error: error.message });
    
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
```

### Search Endpoint Optimization
```typescript
// app/api/my-500/search/route.ts
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Use full-text search if available
    const where = {
      userId: session.user.id,
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { organisation: { contains: q, mode: 'insensitive' } }
        ]
      })
    };
    
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
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
      prisma.contact.count({ where })
    ]);
    
    trackPerformance('my500_search', Date.now() - startTime);
    
    return NextResponse.json({
      success: true,
      data: {
        contacts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      },
      performance: {
        queryTime: Date.now() - startTime,
        totalTime: Date.now() - startTime
      }
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    );
  }
}
```

## Performance Monitoring

### Query Performance Tracking
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
  
  // Alert on slow operations
  if (duration > 2000) {
    console.error(`Slow operation detected: ${operation} took ${duration}ms`, metadata);
  }
}

// Add to Prisma client
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
  
  if (duration > 100) {
    console.warn(`Slow query detected: ${e.query} (${duration}ms)`);
  }
  
  trackPerformance('database_query', duration, {
    query: e.query,
    params: e.params,
    target: e.target
  });
});
```

### Cache Performance Monitoring
```typescript
// lib/cache.ts
export class ContactCache {
  static async getContacts(userId: string, page: number, limit: number): Promise<any> {
    const startTime = Date.now();
    const key = `contacts:${userId}:${page}:${limit}`;
    const cached = await redis.get(key);
    const duration = Date.now() - startTime;
    
    if (cached) {
      trackPerformance('cache_hit', duration, { key });
      return JSON.parse(cached);
    }
    
    trackPerformance('cache_miss', duration, { key });
    return null;
  }
}
```

## Implementation Checklist

### Week 1: Immediate Fixes
- [ ] Add database indexes
- [ ] Optimize My-500 query to eliminate N+1
- [ ] Implement React Query caching
- [ ] Add session caching
- [ ] Deploy performance monitoring

### Week 2: Caching & Optimization
- [ ] Set up Redis caching
- [ ] Implement server-side caching
- [ ] Optimize search queries
- [ ] Add query performance tracking
- [ ] Test performance improvements

### Week 3: Monitoring & Tuning
- [ ] Monitor performance metrics
- [ ] Tune cache TTL values
- [ ] Optimize database queries further
- [ ] Add performance alerts
- [ ] Document performance improvements

## Expected Performance Improvements

### Response Time Targets
- **Current**: 1156ms (slowest requests)
- **Target**: <200ms (95th percentile)
- **Goal**: <100ms (average)

### Query Count Reduction
- **Current**: N+1 queries (N contacts + N activity queries)
- **Target**: 2 queries (contacts + count)
- **Improvement**: 90%+ reduction in database queries

### Cache Hit Rate
- **Target**: >80% cache hit rate
- **Impact**: 80% of requests served from cache

### Memory Usage
- **Target**: <100MB for contact list
- **Optimization**: Virtual scrolling for large lists

## Success Metrics

### Performance Metrics
- [ ] Response time <200ms for 95% of requests
- [ ] Cache hit rate >80%
- [ ] Database query time <100ms average
- [ ] Memory usage <100MB for contact list

### User Experience Metrics
- [ ] Page load time <2 seconds
- [ ] Search response time <200ms
- [ ] Smooth scrolling performance
- [ ] No loading spinners for cached data

### Technical Metrics
- [ ] Error rate <1%
- [ ] Database connection pool utilization <80%
- [ ] Cache memory usage <50MB
- [ ] API response consistency

This performance optimization guide provides immediate fixes for the critical issues identified in the My-500 feature, with a clear roadmap for achieving the target performance metrics. 