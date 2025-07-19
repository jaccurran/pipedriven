import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { PipedriveUpdateService } from '@/server/services/pipedriveUpdateService';
import { createPipedriveService } from '@/server/services/pipedriveService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: personId } = await params;
    const updateData = await request.json();

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

    // Update person
    const result = await updateService.updatePerson(personId, updateData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        recordId: result.recordId
      });
    } else {
      const statusCode = result.error?.includes('Conflict') ? 409 : 500;
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 