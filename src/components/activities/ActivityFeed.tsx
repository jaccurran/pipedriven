'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Badge, Button } from '@/components/ui'
import type { ActivityType } from '@prisma/client'

interface Contact {
  id: string
  name: string
  organisation?: string
}

interface Campaign {
  id: string
  name: string
}

interface Activity {
  id: string
  type: ActivityType
  subject: string
  note?: string
  createdAt: Date
  contact?: Contact
  campaign?: Campaign
}

interface ActivityFeedProps {
  userId: string
  className?: string
  limit?: number
}

const getActivityIcon = (type: ActivityType): string => {
  switch (type) {
    case 'CALL':
      return '📞'
    case 'EMAIL':
      return '📧'
    case 'MEETING':
      return '🤝'
    case 'LINKEDIN':
      return '💼'
    case 'REFERRAL':
      return '👥'
    case 'CONFERENCE':
      return '🎤'
    default:
      return '📋'
  }
}

const getActivityTypeVariant = (type: ActivityType): 'default' | 'secondary' | 'outline' => {
  switch (type) {
    case 'MEETING':
      return 'default'
    case 'CALL':
      return 'secondary'
    default:
      return 'outline'
  }
}

const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return new Date(date).toLocaleDateString()
}

export function ActivityFeed({ className = '', limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const fetchActivities = useCallback(async (pageNum = 1, append = false) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      })

      const response = await fetch(`/api/activities?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load activities')
      }

      const data = await response.json()
      
      if (data.success) {
        const newActivities = data.data?.activities || data.data || []
        if (append) {
          setActivities(prev => [...prev, ...newActivities])
        } else {
          setActivities(newActivities)
        }
        setHasMore(newActivities.length === limit)
      } else {
        throw new Error(data.error || 'Failed to load activities')
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [limit])

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchActivities(nextPage, true)
    }
  }

  const refreshActivities = () => {
    setLoading(true)
    setError(null)
    setPage(1)
    fetchActivities(1, false)
  }

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-start space-x-3 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderEmptyState = () => (
    <div className="text-center py-8">
      <div className="text-gray-400 text-4xl mb-3">📋</div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">No activities yet</h3>
      <p className="text-xs text-gray-500 mb-4">Start by logging your first outreach activity</p>
      <Button 
        onClick={() => window.location.href = '/activities/new'}
        size="sm"
      >
        Log Activity
      </Button>
    </div>
  )

  const renderErrorState = () => (
    <div className="text-center py-8">
      <div className="text-red-400 text-4xl mb-3">⚠️</div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">Failed to load activities</h3>
      <p className="text-xs text-gray-500 mb-4">{error}</p>
      <Button 
        onClick={refreshActivities}
        size="sm"
        variant="outline"
      >
        Try Again
      </Button>
    </div>
  )

  if (loading && activities.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
        </div>
        {renderLoadingSkeleton()}
      </Card>
    )
  }

  if (error && activities.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
        </div>
        {renderErrorState()}
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
        {activities.length > 0 && (
          <Badge variant="outline" size="sm">
            {activities.length}
          </Badge>
        )}
      </div>

      {activities.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 group">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge 
                    variant={getActivityTypeVariant(activity.type)}
                    size="sm"
                  >
                    {activity.type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
                
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.subject}
                </p>
                
                {activity.note && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {activity.note}
                  </p>
                )}
                
                {(activity.contact || activity.campaign) && (
                  <div className="flex items-center space-x-2 mt-2">
                    {activity.contact && (
                      <span className="text-xs text-gray-500">
                        📞 {activity.contact.name}
                        {activity.contact.organisation && ` (${activity.contact.organisation})`}
                      </span>
                    )}
                    {activity.campaign && (
                      <span className="text-xs text-gray-500">
                        🎯 {activity.campaign.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {hasMore && (
            <div className="text-center pt-4">
              <Button 
                onClick={loadMore}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
} 