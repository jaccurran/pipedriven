'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Badge } from '@/components/ui'
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

interface ActivityTimelineProps {
  className?: string
  limit?: number
}

const getActivityIcon = (type: ActivityType): string => {
  switch (type) {
    case 'EMAIL':
      return '📧'
    case 'CALL':
      return '📞'
    case 'MEETING':
      return '🤝'
    case 'LINKEDIN':
      return '💼'
    case 'REFERRAL':
      return '👥'
    case 'CONFERENCE':
      return '🎤'
    default:
      return '📝'
  }
}

const getActivityTypeVariant = (type: ActivityType): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (type) {
    case 'EMAIL':
      return 'info'
    case 'CALL':
      return 'success'
    case 'MEETING':
      return 'warning'
    case 'LINKEDIN':
      return 'default'
    case 'REFERRAL':
      return 'success'
    case 'CONFERENCE':
      return 'info'
    default:
      return 'default'
  }
}

const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }
}

export function ActivityTimeline({ className = '', limit = 10 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchActivities = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      const response = await fetch(`/api/activities?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load activities')
      }

      const data = await response.json()
      
      if (data.success) {
        const newActivities = data.data.activities || data.data || []
        if (page === 1) {
          setActivities(newActivities)
        } else {
          setActivities(prev => [...prev, ...newActivities])
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
      const nextPage = Math.floor(activities.length / limit) + 1
      fetchActivities(nextPage)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
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
      <h3 className="text-sm font-medium text-gray-900 mb-1">No recent activities</h3>
      <p className="text-xs text-gray-500">Start by logging your first outreach activity</p>
    </div>
  )

  const renderErrorState = () => (
    <div className="text-center py-8">
      <div className="text-red-400 text-4xl mb-3">⚠️</div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">Failed to load activities</h3>
      <p className="text-xs text-gray-500">Please try again later</p>
    </div>
  )

  if (loading && activities.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activities</h3>
        {renderLoadingSkeleton()}
      </Card>
    )
  }

  if (error && activities.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activities</h3>
        {renderErrorState()}
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activities</h3>
        {activities.length > 0 && (
          <Badge variant="outline" size="sm">
            {activities.length}
          </Badge>
        )}
      </div>

      {activities.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="space-y-3">
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
                
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {activity.contact && (
                    <span className="truncate">
                      {activity.contact.name}
                      {activity.contact.organisation && (
                        <span> • {activity.contact.organisation}</span>
                      )}
                    </span>
                  )}
                  {activity.campaign && (
                    <span className="truncate">
                      {activity.campaign.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full mt-4 py-2 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </Card>
  )
} 