import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the latest sync for the user
    const latestSync = await prisma.syncHistory.findFirst({
      where: { userId: session.user.id },
      orderBy: { startTime: 'desc' },
      select: { id: true, status: true, startTime: true, endTime: true }
    })

    if (!latestSync) {
      return NextResponse.json({ syncId: null, status: null })
    }

    return NextResponse.json({
      syncId: latestSync.id,
      status: latestSync.status,
      startTime: latestSync.startTime,
      endTime: latestSync.endTime
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch latest sync' }, { status: 500 })
  }
} 