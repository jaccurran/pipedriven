import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

export const updatePreferencesSchema = z.object({
  role: z.enum(['CONSULTANT', 'GOLDEN_TICKET']),
  quickActionMode: z.enum(['SIMPLE', 'DETAILED']),
  emailNotifications: z.boolean(),
  activityReminders: z.boolean(),
  campaignUpdates: z.boolean(),
  syncStatusAlerts: z.boolean(),
});

export const updateApiKeySchema = z.object({
  apiKey: z.string().regex(/^api_.+/, 'API key must start with "api_" and contain additional characters'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>; 