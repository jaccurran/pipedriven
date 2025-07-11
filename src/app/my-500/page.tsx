import { My500Page } from '@/components/contacts/My500Page'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import { sortContactsForMy500 } from '@/lib/contactSorting'
import { redirect } from 'next/navigation'

export default async function My500PageWrapper() {
  const session = await getServerSession()
  if (!session?.user) {
    // Not authenticated, redirect to sign-in
    redirect('/auth/signin')
  }

  const contactService = new ContactService()
  const { contacts } = await contactService.getContacts({ userId: session.user.id, limit: 500 })
  const sortedContacts = sortContactsForMy500(contacts)

  return <My500Page contacts={sortedContacts} />
} 