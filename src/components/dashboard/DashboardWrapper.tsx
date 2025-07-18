'use client'

import { DashboardTabs } from './DashboardTabs'
import { PipedriveApiKeyForm } from '@/components/PipedriveApiKeyForm'
import type { User } from '@prisma/client'

interface DashboardWrapperProps {
  user: User
}

export function DashboardWrapper({ user }: DashboardWrapperProps) {
  return (
    <div className="space-y-8">
      <DashboardTabs user={user} />
      
      {/* Pipedrive Integration Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Pipedrive Integration
          </h2>
          
          <PipedriveApiKeyForm 
            userId={user.id}
            currentApiKey={user.pipedriveApiKey}
          />
        </div>
      </div>
    </div>
  )
} 