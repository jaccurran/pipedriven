import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { authOptions } from '@/lib/auth'
import { createPipedriveService } from '@/server/services/pipedriveService'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Pipedrive service for user
    const pipedriveService = await createPipedriveService(session.user.id)
    if (!pipedriveService) {
      return NextResponse.json(
        { error: 'No Pipedrive API key configured' },
        { status: 400 }
      )
    }

    // Test connection
    const result = await pipedriveService.testConnection()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Pipedrive API connection successful',
        user: result.user,
        diagnostics: result.diagnostics,
      })
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to connect to Pipedrive API',
          diagnostics: result.diagnostics,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error testing Pipedrive connection:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        diagnostics: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        }
      },
      { status: 500 }
    )
  }
} 