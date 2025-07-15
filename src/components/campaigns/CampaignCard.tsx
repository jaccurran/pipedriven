'use client'

import React from 'react'
import { Campaign } from '@prisma/client'
import { Card } from '@/components/ui'
import { QuickActionButton, type ActionType } from '@/components/actions/QuickActionButton'
import { ActionMenu, type SecondaryActionType } from '@/components/actions/ActionMenu'
import { cn } from '@/lib/utils'

interface CampaignCardProps {
  campaign: Campaign
  onEdit?: (campaign: Campaign) => void
  onDelete?: (campaign: Campaign) => void
  onActivity?: (campaignId: string, actionType: ActionType | SecondaryActionType) => void
  onDragStart?: (e: React.DragEvent, campaignId: string) => void
  onDragEnd?: () => void
  isDragging?: boolean
  className?: string
}

export function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onActivity,
  onDragStart,
  onDragEnd,
  isDragging = false,
  className = '',
}: CampaignCardProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  // Handle primary action clicks
  const handlePrimaryAction = (type: ActionType) => {
    if (onActivity) {
      onActivity(campaign.id, type)
    }
  }

  // Handle secondary action clicks
  const handleSecondaryAction = (type: SecondaryActionType) => {
    if (onActivity) {
      onActivity(campaign.id, type)
    }
  }

  return (
    <Card
      className={cn(
        'mb-3 cursor-move transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        isDragging && 'opacity-50 scale-95',
        isDragging && 'shadow-lg',
        className
      )}
      data-testid="campaign-card"
      draggable
      onDragStart={(e) => onDragStart?.(e, campaign.id)}
      onDragEnd={onDragEnd}
      aria-label={`Campaign: ${campaign.name}. Drag to move between columns.`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          // Handle card selection/focus
        }
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {campaign.name}
            </h3>
            {campaign.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {campaign.description}
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-1 ml-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(campaign)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Edit campaign"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(campaign)
                }}
                className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label="Delete campaign"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Target:</span>
            <span className="ml-1 font-medium">{campaign.targetLeads}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Duration:</span>
            <span className="ml-1 font-medium">
              {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
            </span>
          </div>
        </div>

        {/* Action System */}
        {onActivity && (
          <div className="pt-3 border-t border-gray-100">
            {/* Primary Actions - Responsive layout */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <QuickActionButton
                type="EMAIL"
                onClick={handlePrimaryAction}
                contactName={campaign.name}
                className="flex-1 sm:flex-none text-sm px-3 py-2 min-h-[44px]"
                data-testid="email-action-button"
              />
              <QuickActionButton
                type="MEETING_REQUEST"
                onClick={handlePrimaryAction}
                contactName={campaign.name}
                className="flex-1 sm:flex-none text-sm px-3 py-2 min-h-[44px]"
                data-testid="meeting-request-action-button"
              />
              <QuickActionButton
                type="MEETING"
                onClick={handlePrimaryAction}
                contactName={campaign.name}
                className="flex-1 sm:flex-none text-sm px-3 py-2 min-h-[44px]"
                data-testid="meeting-action-button"
              />
            </div>
            
            {/* Secondary Actions - Right-aligned */}
            <div className="flex justify-end">
              <ActionMenu
                onAction={handleSecondaryAction}
                contactName={campaign.name}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
} 