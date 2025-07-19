'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
// Using inline SVG instead of lucide-react
import { z } from 'zod';

const roleSelectionSchema = z.object({
  role: z.enum(['CONSULTANT', 'GOLDEN_TICKET']),
});

type RoleSelectionInput = z.infer<typeof roleSelectionSchema>;

interface RoleSelectionFormProps {
  currentRole: string;
  onSuccess?: () => void;
}

export default function RoleSelectionForm({ currentRole, onSuccess }: RoleSelectionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RoleSelectionInput>({
    resolver: zodResolver(roleSelectionSchema),
    defaultValues: {
      role: currentRole as 'CONSULTANT' | 'GOLDEN_TICKET',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RoleSelectionInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: data.role,
          quickActionMode: 'SIMPLE', // Keep existing preferences
          emailNotifications: true,
          activityReminders: true,
          campaignUpdates: true,
          syncStatusAlerts: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div>
            <CardTitle>Role Selection</CardTitle>
            <CardDescription>
              Choose your role to customize your experience and permissions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                Role updated successfully! Your new role is now active.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label className="text-base font-medium">Select Your Role</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Consultant Role */}
              <div className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedRole === 'CONSULTANT' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value="CONSULTANT"
                  {...register('role')}
                  className="sr-only"
                  id="role-consultant"
                />
                <label htmlFor="role-consultant" className="cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <svg className="h-6 w-6 text-blue-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Consultant</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Standard access with core features for managing contacts, campaigns, and activities.
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>• Contact management</li>
                        <li>• Campaign creation and tracking</li>
                        <li>• Activity logging</li>
                        <li>• Basic analytics</li>
                      </ul>
                    </div>
                  </div>
                </label>
              </div>

              {/* Golden Ticket Role */}
              <div className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedRole === 'GOLDEN_TICKET' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value="GOLDEN_TICKET"
                  {...register('role')}
                  className="sr-only"
                  id="role-golden-ticket"
                />
                <label htmlFor="role-golden-ticket" className="cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <svg className="h-6 w-6 text-purple-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Golden Ticket</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Premium access with advanced features and priority support.
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>• All Consultant features</li>
                        <li>• Advanced analytics</li>
                        <li>• Priority support</li>
                        <li>• Early access to new features</li>
                      </ul>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {errors.role && (
              <p className="text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Role Information</h4>
            <p className="text-sm text-gray-600">
              Your role determines the features and permissions available to you. 
              Contact your administrator if you need to change your role or have questions about the differences.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Updating Role...
              </>
            ) : (
              'Update Role'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 