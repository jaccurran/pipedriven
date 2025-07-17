import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { type PipedriveOrganization, createPipedriveService } from '@/server/services/pipedriveService';

// In-memory cache for search results (per user)
const searchCache = new Map<string, { results: PipedriveOrganization[]; timestamp: number }>();
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
// Rate limit: 10 requests per minute per user (much more reasonable for search)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { query } = body;
    // Validate query
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    if (query.trim().length < 3) {
      return NextResponse.json({ 
        error: 'Query must be at least 3 characters long',
        results: [] 
      }, { status: 400 });
    }

    const userId = session.user.id;
    const cacheKey = `${userId}:${query.toLowerCase().trim()}`;

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ 
        results: cached.results,
        cached: true 
      });
    }

    // Check rate limit
    const now = Date.now();
    const userLimit = userRateLimits.get(userId);
    if (userLimit && now < userLimit.resetTime) {
      if (userLimit.count >= RATE_LIMIT_MAX) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please wait before searching again.',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        }, { status: 429 });
      }
      userLimit.count++;
    } else {
      userRateLimits.set(userId, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    }

    // Get user's Pipedrive service
    const pipedriveService = await createPipedriveService(session.user.id);
    if (!pipedriveService) {
      return NextResponse.json({ 
        error: 'Pipedrive API key not configured or invalid',
        results: [] 
      }, { status: 400 });
    }

    // Search Pipedrive organizations
    let results: PipedriveOrganization[] = [];
    try {
      const searchResult = await pipedriveService.searchOrganizations(query);
      if (searchResult.success && searchResult.organizations) {
        results = searchResult.organizations;
      } else {
        console.error('Pipedrive search failed:', searchResult.error);
      }
    } catch (error) {
      console.error('Pipedrive search error:', error);
      // Gracefully handle Pipedrive errors
      results = [];
    }

    // Cache the results
    searchCache.set(cacheKey, {
      results,
      timestamp: now
    });

    // Clean up old cache entries (keep only last 100 entries)
    if (searchCache.size > 100) {
      const entries = Array.from(searchCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const toDelete = entries.slice(100);
      toDelete.forEach(([key]) => searchCache.delete(key));
    }

    // Clean up old rate limit entries
    const oldRateLimits = Array.from(userRateLimits.entries())
      .filter(([, limit]) => now > limit.resetTime);
    oldRateLimits.forEach(([key]) => userRateLimits.delete(key));

    return NextResponse.json({ 
      results,
      cached: false 
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error', results: [] }, { status: 500 });
  }
} 