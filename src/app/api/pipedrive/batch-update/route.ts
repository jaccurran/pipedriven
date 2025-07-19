import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { PipedriveUpdateService } from '@/server/services/pipedriveUpdateService';
import { createPipedriveService } from '@/server/services/pipedriveService';
export interface BatchUpdateRequest {
  recordType: 'activity' | 'person' | 'organization' | 'deal';
  recordId: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: 'Invalid request body: updates array is required' },
        { status: 400 }
      );
    }

    if (body.updates.length === 0) {
      return NextResponse.json(
        { error: 'At least one update is required' },
        { status: 400 }
      );
    }

    const updates: BatchUpdateRequest[] = body.updates;

    // Create Pipedrive service
    const pipedriveService = await createPipedriveService(session.user.id);
    if (!pipedriveService) {
      return NextResponse.json(
        { error: 'Pipedrive not configured' },
        { status: 400 }
      );
    }

    // Create update service
    const updateService = new PipedriveUpdateService(pipedriveService);

    // Process batch update
    const result = await updateService.batchUpdate(updates);

    // Return appropriate status code based on results
    const statusCode = result.success ? 200 : 207; // 207 = Multi-Status

    return NextResponse.json({
      success: result.success,
      summary: result.summary
    }, { status: statusCode });
  } catch (error) {
    console.error('Error processing batch update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 