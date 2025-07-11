import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const testConnectionSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    console.log('Test connection request body:', { ...body, apiKey: body.apiKey ? '***' : 'undefined' })
    
    const validation = testConnectionSchema.safeParse(body)
    
    if (!validation.success) {
      console.log('Validation failed:', validation.error.errors)
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { apiKey } = validation.data
    console.log('API key length:', apiKey.length)

    // Test Pipedrive API connection
    const response = await fetch('https://api.pipedrive.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Pipedrive API response status:', response.status)
    console.log('Pipedrive API response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.log('Pipedrive API error:', errorData)
      return NextResponse.json(
        { 
          error: 'Pipedrive API connection failed',
          details: errorData.error || 'Invalid API key or network error'
        },
        { status: 400 }
      )
    }

    const userData = await response.json()
    
    return NextResponse.json({
      message: 'Pipedrive API connection successful',
      user: {
        id: userData.data.id,
        name: userData.data.name,
        email: userData.data.email,
        company: userData.data.company_name,
      },
    })

  } catch (error) {
    console.error('Error testing Pipedrive connection:', error)
    return NextResponse.json(
      { error: 'Failed to test Pipedrive connection' },
      { status: 500 }
    )
  }
} 