'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, Badge, Button, Select, DatePicker, LazyLoad } from '@/components/ui'
import type { SelectOption } from '@/components/ui/Select'

interface AnalyticsData {
  period: string
  totalActivities: number
  totalContacts: number
  totalCampaigns: number
  warmLeads: number
  meetingsScheduled: number
  meetingsCompleted: number
  activitiesByType: {
    CALL: number
    EMAIL: number
    MEETING: number
    LINKEDIN: number
    REFERRAL: number
    CONFERENCE: number
  }
  activitiesByDate: Array<{
    date: string
    count: number
  }>
  topContacts: Array<{
    id: string
    name: string
    organisation?: string
    activityCount: number
    lastActivity: string
  }>
  campaignPerformance: Array<{
    id: string
    name: string
    contactCount: number
    activityCount: number
    warmLeads: number
  }>
}

interface AnalyticsDashboardProps {
  userId: string
  className?: string
}

const timePeriods: SelectOption[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
]

export function AnalyticsDashboard({ userId, className = '' }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [userId, period, customStartDate, customEndDate])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        userId,
        period,
        ...(customStartDate && { startDate: customStartDate.toISOString() }),
        ...(customEndDate && { endDate: customEndDate.toISOString() }),
      })

      const response = await fetch(`/api/analytics?${params}`)
      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  const getActivityTypeVariant = (type: string) => {
    const variantMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      CALL: 'info',
      EMAIL: 'success',
      MEETING: 'warning',
      LINKEDIN: 'info',
      REFERRAL: 'warning',
      CONFERENCE: 'danger',
    }
    return variantMap[type] || 'default'
  }

  const getActivityTypeIcon = (type: string) => {
    const icons = {
      CALL: '📞',
      EMAIL: '📧',
      MEETING: '🤝',
      LINKEDIN: '💼',
      REFERRAL: '👥',
      CONFERENCE: '🎤',
    }
    return icons[type as keyof typeof icons] || '📝'
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <Card className={className}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No analytics data available
          </h3>
          <p className="text-gray-600 mb-4">
            Start logging activities to see your analytics dashboard.
          </p>
          <Link href="/activities/new">
            <Button>
              Log Activity
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              options={timePeriods}
              value={period}
              onChange={setPeriod}
              className="w-full sm:w-48"
            />

            <DatePicker
              selected={customStartDate}
              onChange={setCustomStartDate}
              placeholderText="Custom start date"
              className="w-full sm:w-48"
              isClearable
            />

            <DatePicker
              selected={customEndDate}
              onChange={setCustomEndDate}
              placeholderText="Custom end date"
              className="w-full sm:w-48"
              isClearable
            />

            <Button
              onClick={() => {
                setPeriod('30d')
                setCustomStartDate(null)
                setCustomEndDate(null)
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LazyLoad>
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Activities</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(data.totalActivities)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </LazyLoad>

        <LazyLoad>
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Contacts</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(data.totalContacts)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </LazyLoad>

        <LazyLoad>
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">🔥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Warm Leads</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(data.warmLeads)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </LazyLoad>

        <LazyLoad>
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-lg">🤝</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Meetings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(data.meetingsCompleted)}/{formatNumber(data.meetingsScheduled)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </LazyLoad>
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazyLoad>
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Activities by Type
              </h3>
              <div className="space-y-3">
                {Object.entries(data.activitiesByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getActivityTypeIcon(type)}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {type.charAt(0) + type.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNumber(count)}
                      </span>
                      <Badge variant={getActivityTypeVariant(type)}>
                        {formatPercentage(count, data.totalActivities)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </LazyLoad>

        <LazyLoad>
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Top Contacts
              </h3>
              <div className="space-y-3">
                {data.topContacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.name}
                      </p>
                      {contact.organisation && (
                        <p className="text-xs text-gray-500 truncate">
                          {contact.organisation}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-sm text-gray-900">
                        {contact.activityCount} activities
                      </span>
                      <span className="text-xs text-gray-500">
                        {contact.lastActivity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </LazyLoad>
      </div>

      {/* Campaign Performance */}
      <LazyLoad>
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Campaign Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warm Leads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.campaignPerformance.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(campaign.contactCount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(campaign.activityCount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(campaign.warmLeads)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Badge variant={campaign.warmLeads > 0 ? 'success' : 'default'}>
                          {formatPercentage(campaign.warmLeads, campaign.contactCount)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </LazyLoad>
    </div>
  )
} 