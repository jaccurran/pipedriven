import { useQuery } from '@tanstack/react-query'

interface CustomField {
  id: number
  name: string
  key: string
  type: string
  options: Array<{ id: number; label: string; value: string }>
}

interface My500Filters {
  countries: string[]
  sectors: string[]
  recurringFrequencies: string[]
  totalOrganizations: number
  customFields: {
    person: CustomField[]
    organization: CustomField[]
  }
}

export function useMy500Filters() {
  return useQuery<My500Filters>({
    queryKey: ['my500-filters'],
    queryFn: async () => {
      const response = await fetch('/api/my-500/filters')
      if (!response.ok) {
        throw new Error('Failed to fetch filters')
      }
      const data = await response.json()
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
} 