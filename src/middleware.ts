import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/auth/signin',
  '/auth/register',
  '/auth/error',
  '/api/auth',
  '/api/webhooks',
]

// Define routes that require API key validation
const apiKeyRequiredRoutes = [
  '/dashboard',
  '/campaigns',
  '/contacts',
  '/activities',
  '/my-500',
  '/analytics',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes without authentication
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if route requires API key validation
  const requiresApiKey = apiKeyRequiredRoutes.some(route => pathname.startsWith(route))

  try {
    // Get session token from cookies
    const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                        request.cookies.get('__Secure-next-auth.session-token')?.value

    // If no session token, redirect to signin
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // If route doesn't require API key, allow access
    if (!requiresApiKey) {
      return NextResponse.next()
    }

    // For API key validation, we'll let the page handle it
    // The middleware will just ensure the user is authenticated
    return NextResponse.next()

  } catch (error) {
    console.error('Middleware error:', error)
    
    // On error, redirect to signin for safety
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 