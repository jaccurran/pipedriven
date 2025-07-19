'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
// Using inline SVG instead of lucide-react
import { PipedriveApiKeyForm } from '@/components/PipedriveApiKeyForm';

interface ApiKeyManagementFormProps {
  currentApiKey?: string | null;
  onSuccess?: () => void;
}

export default function ApiKeyManagementForm({ currentApiKey }: ApiKeyManagementFormProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <div>
            <CardTitle>Pipedrive API Key</CardTitle>
            <CardDescription>
              Manage your Pipedrive API key for data synchronization
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PipedriveApiKeyForm 
          userId="current" // The existing component doesn't actually use this prop
          currentApiKey={currentApiKey || null}
        />
      </CardContent>
    </Card>
  );
} 