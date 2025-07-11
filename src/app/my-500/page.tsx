import { getMy500Data, type ContactWithActivities } from '@/lib/my-500-data'
import { My500Page } from '@/components/contacts/My500Page'

export default async function My500PageServer() {
  // Fetch data server-side with RBAC validation
  const { contacts, error } = await getMy500Data()

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Contacts</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return <My500Page contacts={contacts} />
} 