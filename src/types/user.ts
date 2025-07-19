import type { User } from '@prisma/client'

// Type for user data without sensitive fields like password
export type UserWithoutPassword = Omit<User, 'password'>

// Type for user data that might be used in forms or displays
export type UserDisplay = Pick<User, 'id' | 'name' | 'email' | 'role' | 'pipedriveApiKey' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'image'>

// Type for user data with all fields except password
export type UserWithSyncData = Omit<User, 'password'>

// User preferences interface
export interface UserPreferences {
  quickActionMode: 'SIMPLE' | 'DETAILED';
  emailNotifications: boolean;
  activityReminders: boolean;
  campaignUpdates: boolean;
  syncStatusAlerts: boolean;
}

// Type for user data with preferences
export interface UserWithPreferences extends UserWithoutPassword {
  preferences: UserPreferences;
}

// Form interfaces for user preferences
export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePreferencesForm {
  role: 'CONSULTANT' | 'GOLDEN_TICKET';
  quickActionMode: 'SIMPLE' | 'DETAILED';
  emailNotifications: boolean;
  activityReminders: boolean;
  campaignUpdates: boolean;
  syncStatusAlerts: boolean;
}

export interface UpdateApiKeyForm {
  apiKey: string;
} 