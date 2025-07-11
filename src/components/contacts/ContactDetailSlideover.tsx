'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Contact, Activity, User } from '@prisma/client'
import { Slideover } from '@/components/ui/Slideover'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface ContactDetailSlideoverProps {
  isOpen: boolean
  contact: Contact
  activities: Activity[]
  user: User
  onClose: () => void
  onEdit: (contact: Contact) => void
  onActivityCreate: (activityData: CreateActivityData) => void
  onActivityEdit: (activity: Activity) => void
  onActivityDelete: (activityId: string) => void
  className?: string
}

interface CreateActivityData {
  type: Activity['type']
  subject?: string
  note?: string
  contactId: string
  dueDate?: Date
}

interface MeetingData {
  date: string
  time: string
  notes: string
}

export function ContactDetailSlideover({
  isOpen,
  contact,
  activities,
  user,
  onClose,
  onEdit,
  onActivityCreate,
  onActivityEdit,
  onActivityDelete,
  className = '',
}: ContactDetailSlideoverProps) {
  const [showMeetingPlannedModal, setShowMeetingPlannedModal] = useState(false)
  const [showMeetingCompletedModal, setShowMeetingCompletedModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null)
  const [meetingData, setMeetingData] = useState<MeetingData>({
    date: '',
    time: '',
    notes: '',
  })
  const [meetingNotes, setMeetingNotes] = useState('')

  // Sort activities by date (newest first)
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [activities])

  // Get warmness score color
  const getWarmnessColor = useCallback((score: number) => {
    if (score >= 7) return 'text-green-600'
    if (score >= 4) return 'text-yellow-600'
    return 'text-red-600'
  }, [])

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }, [])

  // Handle quick action button clicks
  const handleQuickAction = useCallback((type: Activity['type'], subject: string, note: string) => {
    onActivityCreate({
      type,
      subject,
      note,
      contactId: contact.id,
    })
  }, [onActivityCreate, contact.id])

  // Handle meeting planned
  const handleMeetingPlanned = useCallback(() => {
    if (meetingData.date && meetingData.time) {
      const meetingDate = new Date(`${meetingData.date}T${meetingData.time}`)
      onActivityCreate({
        type: 'MEETING',
        subject: 'Meeting Planned',
        note: `Meeting scheduled for ${formatDate(meetingDate)}${meetingData.notes ? ` - ${meetingData.notes}` : ''}`,
        contactId: contact.id,
        dueDate: meetingDate,
      })
      setShowMeetingPlannedModal(false)
      setMeetingData({ date: '', time: '', notes: '' })
    }
  }, [meetingData, onActivityCreate, contact.id, formatDate])

  // Handle meeting completed
  const handleMeetingCompleted = useCallback(() => {
    if (meetingNotes.trim()) {
      onActivityCreate({
        type: 'MEETING',
        subject: 'Meeting Completed',
        note: meetingNotes,
        contactId: contact.id,
      })
      setShowMeetingCompletedModal(false)
      setMeetingNotes('')
    }
  }, [meetingNotes, onActivityCreate, contact.id])

  // Handle activity deletion
  const handleDeleteActivity = useCallback((activityId: string) => {
    setActivityToDelete(activityId)
    setShowDeleteConfirmModal(true)
  }, [])

  const confirmDeleteActivity = useCallback(() => {
    if (activityToDelete) {
      onActivityDelete(activityToDelete)
      setShowDeleteConfirmModal(false)
      setActivityToDelete(null)
    }
  }, [activityToDelete, onActivityDelete])

  // Get activity icon
  const getActivityIcon = useCallback((type: Activity['type']) => {
    switch (type) {
      case 'EMAIL':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'MEETING':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'CALL':
        return (
          <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )
      case 'LINKEDIN':
        return (
          <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        )
      case 'REFERRAL':
        return (
          <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      case 'CONFERENCE':
        return (
          <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }, [])

  return (
    <>
      <Slideover
        isOpen={isOpen}
        onClose={onClose}
        title="Contact Details"
        size="lg"
        className={className}
      >
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{contact.name}</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(contact)}
              >
                Edit Contact
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{contact.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">
                  {contact.phone || 'No phone number'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Organization</label>
                <p className="mt-1 text-sm text-gray-900">
                  {contact.organisation || 'No organization'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Warmness Score</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span 
                    className={cn(
                      'text-lg font-semibold',
                      getWarmnessColor(contact.warmnessScore)
                    )}
                    data-testid="warmness-score"
                  >
                    {contact.warmnessScore}/10
                  </span>
                  <Badge 
                    variant={contact.warmnessScore >= 7 ? 'success' : contact.warmnessScore >= 4 ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {contact.warmnessScore >= 7 ? 'Warm' : contact.warmnessScore >= 4 ? 'Warming' : 'Cold'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Contacted</label>
                <p className="mt-1 text-sm text-gray-900">
                  {contact.lastContacted ? formatDate(contact.lastContacted) : 'Never contacted'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Added to Campaign</label>
                <p className="mt-1 text-sm text-gray-900">
                  {contact.addedToCampaign ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('EMAIL', 'Email Sent', 'Email sent to contact')}
              >
                Email Sent
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('MEETING', 'Meeting Requested', 'Meeting requested with contact')}
              >
                Meeting Requested
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMeetingPlannedModal(true)}
              >
                Schedule Meeting
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('CALL', 'Call Made', 'Call made to contact')}
              >
                Call Made
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMeetingCompletedModal(true)}
              >
                Meeting Completed
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('LINKEDIN', 'LinkedIn Activity', 'LinkedIn activity with contact')}
              >
                LinkedIn Activity
              </Button>
            </div>
          </div>

          {/* Activity History */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Activity History</h3>
            <div className="space-y-3">
              {sortedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.subject || activity.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onActivityEdit(activity)}
                          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          aria-label={`Edit activity: ${activity.subject || activity.type}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                          aria-label={`Delete activity: ${activity.subject || activity.type}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {activity.note && (
                      <p className="mt-1 text-sm text-gray-700">
                        {activity.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {sortedActivities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No activities recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </Slideover>

      {/* Meeting Planned Modal */}
      {showMeetingPlannedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Meeting</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <Input
                  type="text"
                  value={meetingData.date}
                  onChange={(e) => setMeetingData(prev => ({ ...prev, date: e.target.value }))}
                  placeholder="YYYY-MM-DD"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <Input
                  type="text"
                  value={meetingData.time}
                  onChange={(e) => setMeetingData(prev => ({ ...prev, time: e.target.value }))}
                  placeholder="HH:MM"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <Input
                  type="text"
                  value={meetingData.notes}
                  onChange={(e) => setMeetingData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Meeting notes..."
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowMeetingPlannedModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMeetingPlanned}
                disabled={!meetingData.date || !meetingData.time}
              >
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Completed Modal */}
      {showMeetingCompletedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting Completed</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Meeting Notes</label>
              <Input
                type="text"
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Enter meeting notes..."
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowMeetingCompletedModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMeetingCompleted}
                disabled={!meetingNotes.trim()}
              >
                Complete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Activity</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this activity? This action cannot be undone.
            </p>
            
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteActivity}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 