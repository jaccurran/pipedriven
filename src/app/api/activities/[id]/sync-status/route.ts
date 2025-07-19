import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: activityId } = await params;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId, userId: session.user.id }
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      synced: activity.replicatedToPipedrive,
      pipedriveActivityId: activity.pipedriveActivityId?.toString() || null,
      syncAttempts: activity.pipedriveSyncAttempts,
      lastAttempt: activity.lastPipedriveSyncAttempt?.toISOString() || null
    });
  } catch (error) {
    console.error('Error getting activity sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 