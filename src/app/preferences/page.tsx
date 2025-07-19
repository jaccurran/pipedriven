import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import PreferencesContent from '@/components/preferences/PreferencesContent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default async function PreferencesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Preferences</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings, API configurations, and application preferences.
          </p>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <PreferencesContent />
        </Suspense>
      </div>
    </div>
  );
} 