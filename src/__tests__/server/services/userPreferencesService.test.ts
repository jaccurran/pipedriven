import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserPreferencesService } from '@/server/services/userPreferencesService';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createMockUser, createMockPreferences } from '@/__tests__/utils/testDataFactories';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('UserPreferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      const mockUser = createMockUser();
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await UserPreferencesService.getUserPreferences('user-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          quickActionMode: true,
          emailNotifications: true,
          activityReminders: true,
          campaignUpdates: true,
          syncStatusAlerts: true,
        },
      });

      expect(result).toEqual({
        quickActionMode: mockUser.quickActionMode,
        emailNotifications: mockUser.emailNotifications,
        activityReminders: mockUser.activityReminders,
        campaignUpdates: mockUser.campaignUpdates,
        syncStatusAlerts: mockUser.syncStatusAlerts,
      });
    });

    it('should throw error when user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        UserPreferencesService.getUserPreferences('non-existent')
      ).rejects.toThrow('User not found');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.findUnique as any).mockRejectedValue(new Error('Database error'));

      await expect(
        UserPreferencesService.getUserPreferences('user-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const mockUser = createMockUser();
      const updateData = {
        role: 'GOLDEN_TICKET' as const,
        quickActionMode: 'DETAILED' as const,
        emailNotifications: false,
        activityReminders: true,
        campaignUpdates: false,
        syncStatusAlerts: true,
      };
      
      (prisma.user.update as any).mockResolvedValue({ ...mockUser, ...updateData });

      const result = await UserPreferencesService.updateUserPreferences('user-123', updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
        select: {
          quickActionMode: true,
          emailNotifications: true,
          activityReminders: true,
          campaignUpdates: true,
          syncStatusAlerts: true,
          role: true,
        },
      });

      expect(result).toEqual(updateData);
    });

    it('should throw error when user not found', async () => {
      (prisma.user.update as any).mockRejectedValue(new Error('Record to update not found'));

      const updateData = createMockPreferences();

      await expect(
        UserPreferencesService.updateUserPreferences('non-existent', updateData)
      ).rejects.toThrow('Record to update not found');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.update as any).mockRejectedValue(new Error('Database error'));

      const updateData = createMockPreferences();

      await expect(
        UserPreferencesService.updateUserPreferences('user-123', updateData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = createMockUser({ password: 'hashedOldPassword' });
      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (bcrypt.hash as any).mockResolvedValue('hashedNewPassword');
      (prisma.user.update as any).mockResolvedValue(mockUser);

      await UserPreferencesService.changePassword('user-123', passwordData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { password: true },
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        passwordData.currentPassword,
        mockUser.password
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 12);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'hashedNewPassword' },
      });
    });

    it('should throw error when current password is incorrect', async () => {
      const mockUser = createMockUser({ password: 'hashedOldPassword' });
      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        UserPreferencesService.changePassword('user-123', passwordData)
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      await expect(
        UserPreferencesService.changePassword('non-existent', passwordData)
      ).rejects.toThrow('User not found');
    });

    it('should handle bcrypt errors gracefully', async () => {
      const mockUser = createMockUser({ password: 'hashedOldPassword' });
      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockRejectedValue(new Error('Bcrypt error'));

      await expect(
        UserPreferencesService.changePassword('user-123', passwordData)
      ).rejects.toThrow('Bcrypt error');
    });
  });

  describe('updateApiKey', () => {
    it('should update API key successfully', async () => {
      const apiKey = 'api_test123456789';
      (prisma.user.update as any).mockResolvedValue({ id: 'user-123', pipedriveApiKey: apiKey });

      await UserPreferencesService.updateApiKey('user-123', apiKey);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { pipedriveApiKey: apiKey },
      });
    });

    it('should handle database errors gracefully', async () => {
      const apiKey = 'api_test123456789';
      (prisma.user.update as any).mockRejectedValue(new Error('Database error'));

      await expect(
        UserPreferencesService.updateApiKey('user-123', apiKey)
      ).rejects.toThrow('Database error');
    });
  });

  describe('testApiKey', () => {
    it('should return true for valid API key', async () => {
      const apiKey = 'api_test123456789';
      
      // Mock successful Pipedrive API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { name: 'Test User' } }),
      });

      const result = await UserPreferencesService.testApiKey(apiKey);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/users/me',
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      const apiKey = 'api_invalid123';
      
      // Mock failed Pipedrive API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const result = await UserPreferencesService.testApiKey(apiKey);

      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      const apiKey = 'api_test123456789';
      
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await UserPreferencesService.testApiKey(apiKey);

      expect(result).toBe(false);
    });

    it('should return false for timeout errors', async () => {
      const apiKey = 'api_test123456789';
      
      // Mock timeout
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await UserPreferencesService.testApiKey(apiKey);

      expect(result).toBe(false);
    });
  });
}); 