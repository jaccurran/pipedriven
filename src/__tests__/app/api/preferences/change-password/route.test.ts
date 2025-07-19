import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/preferences/change-password/route';
import { UserPreferencesService } from '@/server/services/userPreferencesService';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/server/services/userPreferencesService');
vi.mock('next-auth');
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

describe('Change Password API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/preferences/change-password', () => {
    it('should change password successfully when authenticated', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.changePassword as any).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/preferences/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordData),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(UserPreferencesService.changePassword).toHaveBeenCalledWith(
        'user-123',
        passwordData
      );
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/preferences/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when request body is invalid', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (getServerSession as any).mockResolvedValue(mockSession);

      const invalidData = {
        currentPassword: '',
        newPassword: 'short',
        confirmPassword: 'different',
      };

      const request = new NextRequest('http://localhost:3000/api/preferences/change-password', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 when current password is incorrect', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.changePassword as any).mockRejectedValue(
        new Error('Current password is incorrect')
      );

      const request = new NextRequest('http://localhost:3000/api/preferences/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Current password is incorrect');
    });

    it('should return 400 when user not found', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.changePassword as any).mockRejectedValue(
        new Error('User not found')
      );

      const request = new NextRequest('http://localhost:3000/api/preferences/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User not found');
    });

    it('should return 500 when service throws unexpected error', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.changePassword as any).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/preferences/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
}); 