import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { 
  UserPreferences, 
  UpdatePreferencesForm, 
  ChangePasswordForm 
} from '@/types/user';

export class UserPreferencesService {
  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        quickActionMode: true,
        emailNotifications: true,
        activityReminders: true,
        campaignUpdates: true,
        syncStatusAlerts: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      quickActionMode: user.quickActionMode,
      emailNotifications: user.emailNotifications,
      activityReminders: user.activityReminders,
      campaignUpdates: user.campaignUpdates,
      syncStatusAlerts: user.syncStatusAlerts,
    };
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string, 
    preferences: UpdatePreferencesForm
  ): Promise<UpdatePreferencesForm> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: preferences,
      select: {
        quickActionMode: true,
        emailNotifications: true,
        activityReminders: true,
        campaignUpdates: true,
        syncStatusAlerts: true,
        role: true,
      },
    });

    return {
      role: updatedUser.role,
      quickActionMode: updatedUser.quickActionMode,
      emailNotifications: updatedUser.emailNotifications,
      activityReminders: updatedUser.activityReminders,
      campaignUpdates: updatedUser.campaignUpdates,
      syncStatusAlerts: updatedUser.syncStatusAlerts,
    };
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string, 
    passwordData: ChangePasswordForm
  ): Promise<void> {
    // Get current user password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.password) {
      throw new Error('User does not have a password set');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      passwordData.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }

  /**
   * Update Pipedrive API key
   */
  static async updateApiKey(userId: string, apiKey: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pipedriveApiKey: apiKey },
    });
  }

  /**
   * Test Pipedrive API key by making a request to Pipedrive API
   */
  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.pipedrive.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch {
      // Return false for any network errors, timeouts, etc.
      return false;
    }
  }
} 