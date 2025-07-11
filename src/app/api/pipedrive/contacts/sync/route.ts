import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { authOptions } from '@/lib/auth'
import { createPipedriveService } from '@/server/services/pipedriveService'
import { prisma } from '@/lib/prisma'

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

    // Get user's contacts
    const contacts = await prisma.contact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    if (contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No contacts to sync',
        synced: 0,
        failed: 0,
      })
    }

    // Sync each contact
    const results = await Promise.allSettled(
      contacts.map(contact => pipedriveService.createOrUpdatePerson(contact))
    )

    const synced = results.filter(
      result => result.status === 'fulfilled' && result.value.success
    ).length

    const failed = results.length - synced

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} contacts to Pipedrive`,
      synced,
      failed,
      total: contacts.length,
    })
  } catch (error) {
    console.error('Error syncing contacts with Pipedrive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    // Get persons from Pipedrive
    const result = await pipedriveService.getPersons()

    if (result.success) {
      return NextResponse.json({
        success: true,
        persons: result.persons,
        count: result.persons?.length || 0,
      })
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to fetch persons from Pipedrive'
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fetching persons from Pipedrive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 