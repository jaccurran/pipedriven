import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PUT } from '@/app/api/preferences/route';
import { UserPreferencesService } from '@/server/services/userPreferencesService';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { createMockPreferences } from '@/__tests__/utils/testDataFactories';

// Mock dependencies
vi.mock('@/server/services/userPreferencesService');
vi.mock('next-auth');
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

describe('Preferences API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/preferences', () => {
    it('should return user preferences when authenticated', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockPreferences = createMockPreferences();

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.getUserPreferences as any).mockResolvedValue(mockPreferences);

      const request = new NextRequest('http://localhost:3000/api/preferences');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPreferences);
      expect(UserPreferencesService.getUserPreferences).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/preferences');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 500 when service throws error', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.getUserPreferences as any).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/preferences');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/preferences', () => {
    it('should update user preferences when authenticated', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const updateData = {
        role: 'GOLDEN_TICKET' as const,
        quickActionMode: 'DETAILED' as const,
        emailNotifications: false,
        activityReminders: true,
        campaignUpdates: false,
        syncStatusAlerts: true,
      };

      const updatedPreferences = { ...updateData };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.updateUserPreferences as any).mockResolvedValue(updatedPreferences);

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedPreferences);
      expect(UserPreferencesService.updateUserPreferences).toHaveBeenCalledWith(
        'user-123',
        updateData
      );
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(createMockPreferences()),
      });

      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when request body is invalid', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (getServerSession as any).mockResolvedValue(mockSession);

      const invalidData = {
        role: 'INVALID_ROLE',
        quickActionMode: 'SIMPLE',
        emailNotifications: 'not-a-boolean',
      };

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
    });

    it('should return 500 when service throws error', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.updateUserPreferences as any).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          role: 'CONSULTANT',
          quickActionMode: 'SIMPLE',
          emailNotifications: true,
          activityReminders: true,
          campaignUpdates: true,
          syncStatusAlerts: true,
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(500);
    });
  });
}); 