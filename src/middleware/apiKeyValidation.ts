import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { checkApiKeyValidity } from '@/lib/apiKeyValidation'

export async function validateApiKeyMiddleware(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const validation = await checkApiKeyValidity(session.user.id)
    
    if (!validation.valid) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('API key validation middleware error:', error)
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
} 