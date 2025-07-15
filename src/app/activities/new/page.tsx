import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ActivityForm } from '@/components/activities/ActivityForm'
import Link from 'next/link'


// Import the ActivityFormData type
interface ActivityFormData {
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'LINKEDIN' | 'REFERRAL' | 'CONFERENCE'
  subject: string
  note?: string
  dueDate?: Date
  contactId?: string
  campaignId?: string
}

export default async function NewActivityPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch user's contacts and campaigns for the form
  const [contacts, campaigns] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        organisation: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.campaign.findMany({
      where: {
        users: {
          some: { id: user.id }
        }
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Map contacts to ensure organisation is undefined if null
  const safeContacts = contacts.map(contact => ({
    ...contact,
    organisation: contact.organisation === null ? undefined : contact.organisation,
  }))

  const handleSubmit = async (activity: ActivityFormData) => {
    try {
      await prisma.activity.create({
        data: {
          type: activity.type,
          subject: activity.subject,
          note: activity.note,
          dueDate: activity.dueDate || null,
          userId: user.id,
          contactId: activity.contactId || null,
          campaignId: activity.campaignId || null,
        },
      })
      
      redirect('/activities')
    } catch (error) {
      console.error('Failed to create activity:', error)
      throw new Error('Failed to create activity')
    }
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Log New Activity</h1>
            <p className="text-gray-600">Record your lead sourcing activities</p>
          </div>
          <Link
            href="/activities"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Activities
          </Link>
        </div>

        {/* Activity Form */}
        <ActivityForm
          userId={user.id}
          contacts={safeContacts}
          campaigns={campaigns}
          onSubmit={handleSubmit}
          onCancel={() => redirect('/activities')}
        />
      </div>
    </DashboardLayout>
  )
} 