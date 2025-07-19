import { describe, it, expect } from 'vitest';
import { 
  changePasswordSchema, 
  updatePreferencesSchema, 
  updateApiKeySchema 
} from '@/lib/validation/userPreferences';

describe('User Preferences Validation Schemas', () => {
  describe('changePasswordSchema', () => {
    it('should validate valid password change data', () => {
      const validData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject when current password is empty', () => {
      const invalidData = {
        currentPassword: '',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Current password is required');
      }
    });

    it('should reject when new password is too short', () => {
      const invalidData = {
        currentPassword: 'oldPassword123',
        newPassword: 'short',
        confirmPassword: 'short',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should reject when passwords do not match', () => {
      const invalidData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'differentPassword123',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords don't match");
      }
    });

    it('should reject when new password is same as current password', () => {
      const invalidData = {
        currentPassword: 'samePassword123',
        newPassword: 'samePassword123',
        confirmPassword: 'samePassword123',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('New password must be different from current password');
      }
    });

    it('should reject when confirm password is empty', () => {
      const invalidData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: '',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please confirm your password');
      }
    });
  });

  describe('updatePreferencesSchema', () => {
    it('should validate valid preferences data', () => {
      const validData = {
        role: 'CONSULTANT' as const,
        quickActionMode: 'SIMPLE' as const,
        emailNotifications: true,
        activityReminders: false,
        campaignUpdates: true,
        syncStatusAlerts: false,
      };

      const result = updatePreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all boolean combinations', () => {
      const validData = {
        role: 'GOLDEN_TICKET' as const,
        quickActionMode: 'DETAILED' as const,
        emailNotifications: false,
        activityReminders: true,
        campaignUpdates: false,
        syncStatusAlerts: true,
      };

      const result = updatePreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const invalidData = {
        role: 'INVALID_ROLE',
        quickActionMode: 'SIMPLE' as const,
        emailNotifications: true,
        activityReminders: true,
        campaignUpdates: true,
        syncStatusAlerts: true,
      };

      const result = updatePreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid quick action mode', () => {
      const invalidData = {
        role: 'CONSULTANT' as const,
        quickActionMode: 'INVALID_MODE',
        emailNotifications: true,
        activityReminders: true,
        campaignUpdates: true,
        syncStatusAlerts: true,
      };

      const result = updatePreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean notification settings', () => {
      const invalidData = {
        role: 'CONSULTANT' as const,
        quickActionMode: 'SIMPLE' as const,
        emailNotifications: 'true', // string instead of boolean
        activityReminders: true,
        campaignUpdates: true,
        syncStatusAlerts: true,
      };

      const result = updatePreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateApiKeySchema', () => {
    it('should validate valid API key', () => {
      const validData = {
        apiKey: 'api_test123456789',
      };

      const result = updateApiKeySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject API key that does not start with "api_"', () => {
      const invalidData = {
        apiKey: 'test123456789',
      };

      const result = updateApiKeySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('API key must start with "api_" and contain additional characters');
      }
    });

    it('should reject empty API key', () => {
      const invalidData = {
        apiKey: '',
      };

      const result = updateApiKeySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject API key with only "api_" prefix', () => {
      const invalidData = {
        apiKey: 'api_',
      };

      const result = updateApiKeySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate API key with special characters after prefix', () => {
      const validData = {
        apiKey: 'api_test-123_456.789',
      };

      const result = updateApiKeySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
}); 