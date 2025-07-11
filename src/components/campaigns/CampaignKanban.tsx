'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Campaign, User } from '@prisma/client'
import { Card, Badge, Button } from '@/components/ui'
import { CampaignCard } from './CampaignCard'
import { cn } from '@/lib/utils'

interface CampaignKanbanProps {
  campaigns: Campaign[]
  user: User
  onStatusChange?: (campaignId: string, newStatus: string) => void
  onEdit?: (campaign: Campaign) => void
  onDelete?: (campaign: Campaign) => void
  className?: string
}

interface KanbanColumn {
  id: string
  title: string
  status: string
  color: string
  icon: string
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'planned',
    title: 'Planned',
    status: 'PLANNED',
    color: 'bg-blue-50 border-blue-200',
    icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    id: 'active',
    title: 'Active',
    status: 'ACTIVE',
    color: 'bg-green-50 border-green-200',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'paused',
    title: 'Paused',
    status: 'PAUSED',
    color: 'bg-yellow-50 border-yellow-200',
    icon: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'completed',
    title: 'Completed',
    status: 'COMPLETED',
    color: 'bg-gray-50 border-gray-200',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

export function CampaignKanban({
  campaigns,
  user,
  onStatusChange,
  onEdit,
  onDelete,
  className = '',
}: CampaignKanbanProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [draggedCampaign, setDraggedCampaign] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Filter campaigns based on search and date range
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDateRange = 
        (!startDate || new Date(campaign.startDate) >= new Date(startDate)) &&
        (!endDate || new Date(campaign.endDate) <= new Date(endDate))
      
      return matchesSearch && matchesDateRange
    })
  }, [campaigns, searchTerm, startDate, endDate])

  // Group campaigns by status
  const campaignsByStatus = useMemo(() => {
    const grouped = KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.status] = filteredCampaigns.filter(
        campaign => campaign.status === column.status
      )
      return acc
    }, {} as Record<string, Campaign[]>)
    
    return grouped
  }, [filteredCampaigns])

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

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, campaignId: string) => {
    setDraggedCampaign(campaignId)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', campaignId)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedCampaign(null)
    setIsDragging(false)
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    
    if (!draggedCampaign || !onStatusChange) return
    
    const campaign = campaigns.find(c => c.id === draggedCampaign)
    if (campaign && campaign.status !== targetStatus) {
      onStatusChange(draggedCampaign, targetStatus)
    }
    
    setDraggedCampaign(null)
    setIsDragging(false)
  }, [draggedCampaign, onStatusChange, campaigns])

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Campaign card component
  const CampaignCardWrapper = ({ campaign }: { campaign: Campaign }) => {
    const isDragging = draggedCampaign === campaign.id
    
    return (
      <CampaignCard
        campaign={campaign}
        onEdit={onEdit}
        onDelete={onDelete}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        isDragging={isDragging}
      />
    )
  }

  // Kanban column component
  const KanbanColumn = ({ column }: { column: KanbanColumn }) => {
    const campaignsInColumn = campaignsByStatus[column.status] || []
    
    return (
      <div
        className={cn(
          'flex flex-col h-full min-h-[500px]',
          'bg-gray-50 rounded-lg border-2 border-dashed border-gray-200',
          'transition-all duration-200',
          isDragging && 'border-blue-300 bg-blue-50'
        )}
        data-testid="kanban-column"
        onDrop={(e) => handleDrop(e, column.status)}
        onDragOver={handleDragOver}
        aria-droppable="true"
        aria-label={`${column.title} column. Drop campaigns here to change status to ${column.title}.`}
      >
        {/* Column Header */}
        <div className={cn(
          'p-4 border-b border-gray-200',
          column.color
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={column.icon} />
              </svg>
              <h3 className="font-medium text-gray-900">{column.title}</h3>
            </div>
            <Badge variant="outline" size="sm">
              {campaignsInColumn.length}
            </Badge>
          </div>
        </div>

        {/* Campaign Cards */}
        <div className="flex-1 p-4 overflow-y-auto">
          {campaignsInColumn.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No campaigns</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaignsInColumn.map((campaign) => (
                <CampaignCardWrapper key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)} data-testid="kanban-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Campaigns</h2>
          <p className="text-sm text-gray-600">
            Manage your campaigns by dragging them between status columns
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredCampaigns.length} of {campaigns.length} campaigns
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="sr-only">Search campaigns</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search campaigns..."
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      {/* Mobile Instructions */}
      <div className="md:hidden bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900">Mobile Tip</h3>
            <p className="text-sm text-blue-700 mt-1">
              Tap and hold a campaign card to drag it between columns on mobile devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 