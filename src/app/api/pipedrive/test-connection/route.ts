import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const testConnectionSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse and validate request body
    const body = await request.json()
    
    const validation = testConnectionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { apiKey } = validation.data

    // Test Pipedrive API connection using query parameter authentication
    const response = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const responseTime = Date.now() - startTime

    // Extract rate limiting information
    const rateLimitInfo = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset'),
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Pipedrive API connection failed',
          details: errorData.error || 'Invalid API key or network error',
          diagnostics: {
            statusCode: response.status,
            statusText: response.statusText,
            responseTime: responseTime + 'ms',
            rateLimitInfo,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 400 }
      )
    }

    const userData = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Pipedrive API connection successful',
      user: {
        id: userData.data.id,
        name: userData.data.name,
        email: userData.data.email,
        company: userData.data.company_name,
      },
      diagnostics: {
        statusCode: response.status,
        responseTime: responseTime + 'ms',
        rateLimitInfo,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
        endpoint: '/users/me',
      }
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Error testing Pipedrive connection:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test Pipedrive connection',
        details: error instanceof Error ? error.message : 'Unknown error',
        diagnostics: {
          responseTime: responseTime + 'ms',
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        }
      },
      { status: 500 }
    )
  }
} 