import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPipedriveService } from '@/server/services/pipedriveService';

// In-memory cache for search results (per user)
const searchCache = new Map<string, { results: unknown[]; timestamp: number }>();
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
// Rate limit: 10 requests per minute per user (much more reasonable for search)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

export async function POST(request: NextRequest) {
  console.log('[Pipedrive Search] Starting search request');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('[Pipedrive Search] Session user:', session?.user?.email || 'No session');
    
    if (!session?.user?.id) {
      console.log('[Pipedrive Search] Unauthorized - no session user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    console.log('[Pipedrive Search] Search query:', query);
    
    // Validate query
    if (!query || typeof query !== 'string') {
      console.log('[Pipedrive Search] Invalid query:', query);
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Minimum query length check
    if (query.trim().length < 3) {
      console.log('[Pipedrive Search] Query too short:', query.trim().length);
      return NextResponse.json({ 
        error: 'Query must be at least 3 characters long',
        results: [] 
      }, { status: 400 });
    }

    const userId = session.user.id;
    const cacheKey = `${userId}:${query.toLowerCase().trim()}`;
    console.log('[Pipedrive Search] Cache key:', cacheKey);

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[Pipedrive Search] Returning cached results:', cached.results.length, 'contacts');
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
        console.log('[Pipedrive Search] Rate limit exceeded for user:', userId);
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
    console.log('[Pipedrive Search] Creating Pipedrive service for user:', userId);
    const pipedriveService = await createPipedriveService(session.user.id);
    if (!pipedriveService) {
      console.log('[Pipedrive Search] Failed to create Pipedrive service - no API key or invalid');
      return NextResponse.json({ 
        error: 'Pipedrive API key not configured or invalid',
        results: [] 
      }, { status: 400 });
    }

    console.log('[Pipedrive Search] Pipedrive service created successfully');

    // Search Pipedrive
    const searchTerms = query.split(' ').filter(term => term.length > 0);
    console.log('[Pipedrive Search] Search terms:', searchTerms);
    
    const searchResults = await Promise.all(
      searchTerms.map(async (term: string) => {
        console.log('[Pipedrive Search] Searching for term:', term);
        const result = await pipedriveService.searchPersons(term);
        console.log('[Pipedrive Search] Search result for term', term, ':', result.length, 'contacts');
        return result;
      })
    );

    const flattenedResults = searchResults.flat();
    console.log('[Pipedrive Search] Total results after flattening:', flattenedResults.length);

    // Deduplicate results by ID to prevent React key conflicts
    const uniqueResults = flattenedResults.filter((contact, index, self) => 
      index === self.findIndex(c => c.id === contact.id)
    );
    console.log('[Pipedrive Search] Unique results after deduplication:', uniqueResults.length);

    // Cache the results
    searchCache.set(cacheKey, {
      results: uniqueResults,
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

    console.log('[Pipedrive Search] Returning results:', uniqueResults.length, 'contacts');
    return NextResponse.json({ 
      results: uniqueResults,
      cached: false 
    });

  } catch (error) {
    console.error('[Pipedrive Search] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to search Pipedrive contacts',
      results: [] 
    }, { status: 500 });
  }
} 