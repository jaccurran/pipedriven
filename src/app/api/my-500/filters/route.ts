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

    // Fetch organizations from Pipedrive
    const organizationsResult = await pipedriveService.getOrganizations()
    
    if (!organizationsResult.success) {
      return createApiError('Failed to fetch organizations from Pipedrive', 500)
    }

    const organizations = organizationsResult.organizations || []

    // Fetch custom fields for both persons and organizations
    const [personFieldsResult, orgFieldsResult] = await Promise.all([
      pipedriveService.getPersonCustomFields(),
      pipedriveService.getOrganizationCustomFields()
    ])

    // Extract unique countries and industries
    const countries = new Set<string>()
    const sectors = new Set<string>()
    const recurringFrequencies = new Set<string>()
    const customFields = {
      person: personFieldsResult.success ? personFieldsResult.fields || [] : [],
      organization: orgFieldsResult.success ? orgFieldsResult.fields || [] : []
    }

    organizations.forEach(org => {
      // Add country if available
      if (org.country) {
        countries.add(org.country)
      } else if (org.address) {
        // Try to extract country from address as fallback
        const addressParts = org.address.split(',').map(part => part.trim())
        const lastPart = addressParts[addressParts.length - 1]
        if (lastPart && lastPart.length > 0 && lastPart.length < 50) {
          countries.add(lastPart)
        }
      }

      // Add industry/sector if available
      if (org.industry) {
        sectors.add(org.industry)
      }
    })

    // Extract countries and sectors from specific custom fields
    customFields.organization.forEach(field => {
      // Organization Country field
      if (field.key === 'ffabdba1164ad9f4cb96c1f12ab12294f2987122' || field.name === 'Country') {
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            if (option.label && option.label.length > 0) {
              countries.add(option.label)
            }
          })
        }
      }
      
      // Organization Sector field
      if (field.key === '0333b4d1dc8f3e971d51197989327cdf50e21961' || field.name === 'Sector') {
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            if (option.label && option.label.length > 0) {
              sectors.add(option.label)
            }
          })
        }
      }
    })

    // Also extract from person custom fields
    customFields.person.forEach(field => {
      // Person Sector field
      if (field.key === '3d61958b09b80a83cb7712ce5aa67bdfc9f1c17e' || field.name === 'Sector') {
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            if (option.label && option.label.length > 0) {
              sectors.add(option.label)
            }
          })
        }
      }
      
      // Recurring Activity Frequency field
      if (field.key === 'dbaed06e0a739b30fe86174c77efb5cb825ee291' || field.name === 'Recurring Activity Frequency') {
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            if (option.label && option.label.length > 0) {
              recurringFrequencies.add(option.label)
            }
          })
        }
      }
    })

    // Also check our local database for additional countries and sectors
    const { prisma } = await import('@/lib/prisma')
    
    try {
      const localOrganizations = await prisma.organization.findMany({
        where: {
          contacts: {
            some: {
              userId: session.user.id
            }
          }
        },
        select: {
          country: true,
          industry: true
        }
      })

      localOrganizations.forEach(org => {
        if (org.country) {
          countries.add(org.country)
        }
        if (org.industry) {
          sectors.add(org.industry)
        }
      })
    } catch (dbError) {
      console.error('Database query error:', dbError)
      // Continue without local data if there's an error
    }

    // Convert to sorted arrays
    const countriesList = Array.from(countries)
      .filter(country => country && country.length > 0)
      .sort()

    const sectorsList = Array.from(sectors)
      .filter(sector => sector && sector.length > 0)
      .sort()

    const recurringFrequenciesList = Array.from(recurringFrequencies)
      .filter(freq => freq && freq.length > 0)
      .sort()

    return createApiSuccess({
      countries: countriesList,
      sectors: sectorsList,
      recurringFrequencies: recurringFrequenciesList,
      totalOrganizations: organizations.length,
      customFields: {
        person: customFields.person.map(field => ({
          id: field.id,
          name: field.name,
          key: field.key,
          type: field.field_type,
          options: field.options || []
        })),
        organization: customFields.organization.map(field => ({
          id: field.id,
          name: field.name,
          key: field.key,
          type: field.field_type,
          options: field.options || []
        }))
      }
    })

  } catch (error: unknown) {
    console.error('Filters API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return createApiError(errorMessage, 500)
  }
} 