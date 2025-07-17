import { getServerSession } from '@/lib/auth'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'
import { createPipedriveService } from '@/server/services/pipedriveService'

export async function GET() {
  try {
    // Auth check
    const session = await getServerSession()
    if (!session?.user?.id) {
      return createApiError('Authentication required', 401)
    }

    const pipedriveService = await createPipedriveService(session.user.id)
    
    if (!pipedriveService) {
      return createApiError('Failed to create Pipedrive service - check API key configuration', 500)
    }

    // Fetch custom fields for both persons and organizations
    const [personFieldsResult, orgFieldsResult] = await Promise.all([
      pipedriveService.getPersonCustomFields(),
      pipedriveService.getOrganizationCustomFields()
    ])

    if (!personFieldsResult.success) {
      console.error('Failed to fetch person custom fields:', personFieldsResult.error)
    }

    if (!orgFieldsResult.success) {
      console.error('Failed to fetch organization custom fields:', orgFieldsResult.error)
    }

    return createApiSuccess({
      personFields: personFieldsResult.success ? personFieldsResult.fields : [],
      organizationFields: orgFieldsResult.success ? orgFieldsResult.fields : [],
      personFieldsError: personFieldsResult.error,
      organizationFieldsError: orgFieldsResult.error
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return createApiError(errorMessage, 500)
  }
} 