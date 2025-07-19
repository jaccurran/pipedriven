'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Contact, Activity, User } from '@prisma/client'
import { Slideover } from '@/components/ui/Slideover'
import { Button, Input } from '@/components/ui'
import { QuickActionButton, type ActionType } from '@/components/actions/QuickActionButton'
import { ActionMenu, type SecondaryActionType } from '@/components/actions/ActionMenu'

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [meetingData, setMeetingData] = useState<MeetingData>({
    date: '',
    time: '',
    notes: '',
  })
  const [meetingNotes, setMeetingNotes] = useState('')

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [activities])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'EMAIL':
        return <span className="text-blue-500">📧</span>
      case 'CALL':
        return <span className="text-green-500">📞</span>
      case 'MEETING':
        return <span className="text-purple-500">🤝</span>
      default:
        return <span className="text-gray-500">📝</span>
    }
  }

  const handleQuickAction = useCallback((type: Activity['type'], subject: string, note: string) => {
    onActivityCreate({
      type,
      subject,
      note,
      contactId: contact.id,
    })
  }, [onActivityCreate, contact.id])

  const handlePrimaryAction = (type: ActionType) => {
    // Map ActionType to activity type and create activity with rich context
    const activityMap: Record<ActionType, { type: Activity['type']; subject: string; note: string }> = {
      EMAIL: { 
        type: 'EMAIL', 
        subject: `📧 Email to ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`, 
        note: `📧 Email communication with ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}` 
      },
      MEETING_REQUEST: { 
        type: 'MEETING_REQUEST', 
        subject: `🍽️ Meeting Request - ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`, 
        note: `🍽️ Meeting request sent to ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}` 
      },
      MEETING: { 
        type: 'MEETING', 
        subject: `🤝 Meeting with ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`, 
        note: `🤝 Meeting scheduled with ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}` 
      }
    }
    
    const activity = activityMap[type]
    handleQuickAction(activity.type, activity.subject, activity.note)
  }

  const handleSecondaryAction = (type: SecondaryActionType, note?: string) => {
    // Map SecondaryActionType to activity type and create activity with rich context
    const activityMap: Record<SecondaryActionType, { type: Activity['type']; subject: string; note: string }> = {
      LINKEDIN: { 
        type: 'LINKEDIN', 
        subject: `💼 LinkedIn Engagement - ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`, 
        note: note || `💼 LinkedIn engagement with ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}` 
      },
      PHONE_CALL: { 
        type: 'CALL', 
        subject: `📞 Call with ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`, 
        note: note || `📞 Phone call with ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}` 
      },
      CONFERENCE: { 
        type: 'CONFERENCE', 
        subject: `🎤 Conference Meeting - ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`, 
        note: note || `🎤 Conference meeting with ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}` 
      },
      REMOVE_AS_ACTIVE: { 
        type: 'MEETING', // Default to MEETING type for remove as active
        subject: `🚫 Remove as Active - ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`, 
        note: note || `🚫 Contact removed as active: ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}` 
      }
    }
    
    const activity = activityMap[type]
    handleQuickAction(activity.type, activity.subject, activity.note)
  }

  const handleMeetingPlanned = () => {
    const subject = `🤝 Meeting Planned - ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''} on ${meetingData.date} at ${meetingData.time}`
    const note = meetingData.notes || `🤝 Meeting scheduled with ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''} on ${meetingData.date} at ${meetingData.time}${user.name ? ` by ${user.name}` : ''}`
    
    onActivityCreate({
      type: 'MEETING',
      subject,
      note,
      contactId: contact.id,
      dueDate: new Date(`${meetingData.date}T${meetingData.time}`),
    })
    
    setShowMeetingPlannedModal(false)
    setMeetingData({ date: '', time: '', notes: '' })
  }

  const handleMeetingCompleted = () => {
    onActivityCreate({
      type: 'MEETING',
      subject: `✅ Meeting Completed - ${contact.name}${contact.organisation ? ` (${contact.organisation})` : ''}`,
      note: meetingNotes || `✅ Meeting completed with ${contact.name}${contact.organisation ? ` from ${contact.organisation}` : ''}${user.name ? ` by ${user.name}` : ''}`,
      contactId: contact.id,
    })
    
    setShowMeetingCompletedModal(false)
    setMeetingNotes('')
  }

  const handleDeleteActivity = (activityId: string) => {
    setShowDeleteConfirm(activityId)
  }

  const confirmDeleteActivity = () => {
    if (showDeleteConfirm) {
      onActivityDelete(showDeleteConfirm)
      setShowDeleteConfirm(null)
    }
  }

  const getWarmnessColor = (score: number) => {
    if (score >= 7) return 'text-green-600'
    if (score >= 4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getWarmnessLabel = (score: number) => {
    if (score >= 7) return 'Warm'
    if (score >= 4) return 'Lukewarm'
    return 'Cold'
  }

  const getWarmnessBgColor = (score: number) => {
    if (score >= 7) return 'bg-green-100 text-green-800'
    if (score >= 4) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <>
      <Slideover
        isOpen={isOpen}
        onClose={onClose}
        title="Contact Details"
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
                <p className="mt-1 text-sm text-gray-900">{contact.phone || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Organization</label>
                <p className="mt-1 text-sm text-gray-900">{contact.organisation || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Warmness Score</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span 
                    className={`text-lg font-semibold ${getWarmnessColor(contact.warmnessScore)}`}
                    data-testid="warmness-score"
                  >
                    {contact.warmnessScore}/10
                  </span>
                  <span className={`inline-flex items-center justify-center font-medium rounded-full transition-colors duration-200 px-2 py-0.5 text-xs ${getWarmnessBgColor(contact.warmnessScore)}`}>
                    {getWarmnessLabel(contact.warmnessScore)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {/* Primary Actions - Always visible */}
              <QuickActionButton
                type="EMAIL"
                onClick={handlePrimaryAction}
                contactName={contact.name}
                className="text-xs px-2 py-1"
              />
              <QuickActionButton
                type="MEETING_REQUEST"
                onClick={handlePrimaryAction}
                contactName={contact.name}
                className="text-xs px-2 py-1"
              />
              <QuickActionButton
                type="MEETING"
                onClick={handlePrimaryAction}
                contactName={contact.name}
                className="text-xs px-2 py-1"
              />
              {/* Secondary Actions - In ellipsis menu */}
              <ActionMenu
                onAction={handleSecondaryAction}
                contactName={contact.name}
              />
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
                  data-testid="activity-item"
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
                  onChange={(value) => setMeetingData(prev => ({ ...prev, date: value }))}
                  placeholder="YYYY-MM-DD"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <Input
                  type="text"
                  value={meetingData.time}
                  onChange={(value) => setMeetingData(prev => ({ ...prev, time: value }))}
                  placeholder="HH:MM"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <Input
                  type="text"
                  value={meetingData.notes}
                  onChange={(value) => setMeetingData(prev => ({ ...prev, notes: value }))}
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
                onChange={(value) => setMeetingNotes(value)}
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
              <Button onClick={handleMeetingCompleted}>
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Activity</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this activity? This action cannot be undone.
            </p>
            
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
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