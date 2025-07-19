'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
// Using inline SVG instead of lucide-react

interface QuickActionModeToggleProps {
  currentMode: 'SIMPLE' | 'DETAILED';
  onSuccess?: () => void;
}

export default function QuickActionModeToggle({ currentMode, onSuccess }: QuickActionModeToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'SIMPLE' | 'DETAILED'>(currentMode);

  const handleModeChange = async (mode: 'SIMPLE' | 'DETAILED') => {
    if (mode === selectedMode) return;

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
          role: 'CONSULTANT', // Keep existing role
          quickActionMode: mode,
          emailNotifications: true, // Keep existing preferences
          activityReminders: true,
          campaignUpdates: true,
          syncStatusAlerts: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update quick action mode');
      }

      setSelectedMode(mode);
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <CardTitle>Quick Action Mode</CardTitle>
            <CardDescription>
              Choose how detailed your quick action forms should be
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                Quick action mode updated successfully!
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label className="text-base font-medium">Select Mode</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Simple Mode */}
              <div className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMode === 'SIMPLE' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <button
                  type="button"
                  onClick={() => handleModeChange('SIMPLE')}
                  disabled={isLoading}
                  className="w-full text-left"
                >
                  <div className="flex items-start space-x-3">
                    <svg className="h-6 w-6 text-green-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Simple</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Quick and streamlined forms for fast data entry.
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>• Minimal required fields</li>
                        <li>• One-click actions</li>
                        <li>• Fast data entry</li>
                        <li>• Mobile-friendly</li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>

              {/* Detailed Mode */}
              <div className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMode === 'DETAILED' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <button
                  type="button"
                  onClick={() => handleModeChange('DETAILED')}
                  disabled={isLoading}
                  className="w-full text-left"
                >
                  <div className="flex items-start space-x-3">
                    <svg className="h-6 w-6 text-blue-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Detailed</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Comprehensive forms with all available fields and options.
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>• All available fields</li>
                        <li>• Advanced options</li>
                        <li>• Rich data capture</li>
                        <li>• Custom workflows</li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner className="mr-2 h-4 w-4" />
                <span className="text-sm text-gray-600">Updating mode...</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Mode Information</h4>
            <p className="text-sm text-gray-600">
              This setting affects how quick action forms are displayed throughout the application. 
              You can change this setting at any time and it will apply to all new quick actions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 