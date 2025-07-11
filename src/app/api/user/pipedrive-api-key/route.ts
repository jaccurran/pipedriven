import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
})

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateApiKeySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { apiKey } = validation.data

    // Update user's Pipedrive API key
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { pipedriveApiKey: apiKey },
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
      },
    })

    return NextResponse.json({
      message: 'Pipedrive API key updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        hasApiKey: !!updatedUser.pipedriveApiKey,
      },
    })

  } catch (error) {
    console.error('Error updating Pipedrive API key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's current API key status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      hasApiKey: !!user.pipedriveApiKey,
      user: {
        id: user.id,
        email: user.email,
      },
    })

  } catch (error) {
    console.error('Error fetching Pipedrive API key status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 