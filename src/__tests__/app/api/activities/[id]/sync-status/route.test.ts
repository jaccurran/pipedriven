import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/activities/[id]/sync-status/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn()
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findUnique: vi.fn()
    }
  }
}));

const mockSession = { user: { id: 'user-123' } };
const mockActivity = {
  id: 'activity-123',
  pipedriveActivityId: 789,
  replicatedToPipedrive: true,
  pipedriveSyncAttempts: 1,
  lastPipedriveSyncAttempt: new Date('2024-12-25T10:00:00Z')
};

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrismaActivity = vi.mocked(prisma.activity);

describe('/api/activities/[id]/sync-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
    mockPrismaActivity.findUnique.mockResolvedValue(mockActivity as any);
  });

  it('should return sync status for activity', async () => {
    const request = new NextRequest('http://localhost:3000/api/activities/activity-123/sync-status');

    const response = await GET(request, { params: { id: 'activity-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      synced: true,
      pipedriveActivityId: '789',
      syncAttempts: 1,
      lastAttempt: '2024-12-25T10:00:00.000Z'
    });
  });

  it('should return sync status for unsynced activity', async () => {
    const unsyncedActivity = {
      id: 'activity-123',
      pipedriveActivityId: null,
      replicatedToPipedrive: false,
      pipedriveSyncAttempts: 0,
      lastPipedriveSyncAttempt: null
    };

    mockPrismaActivity.findUnique.mockResolvedValue(unsyncedActivity as any);

    const request = new NextRequest('http://localhost:3000/api/activities/activity-123/sync-status');

    const response = await GET(request, { params: { id: 'activity-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      synced: false,
      pipedriveActivityId: null,
      syncAttempts: 0,
      lastAttempt: null
    });
  });

  it('should return 401 if not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/api/activities/activity-123/sync-status');

    const response = await GET(request, { params: { id: 'activity-123' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 404 if activity not found', async () => {
    mockPrismaActivity.findUnique.mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/api/activities/activity-123/sync-status');

    const response = await GET(request, { params: { id: 'activity-123' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Activity not found' });
  });

  it('should return 404 if activity belongs to different user', async () => {
    // When activity belongs to different user, the query should return null
    mockPrismaActivity.findUnique.mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/api/activities/activity-123/sync-status');

    const response = await GET(request, { params: { id: 'activity-123' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Activity not found' });
  });
}); 