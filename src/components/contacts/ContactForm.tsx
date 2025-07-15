import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Input, Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface ContactFormValues {
  name: string
  email: string
  phone?: string
  organisation?: string
  organizationId?: string
  warmnessScore?: number
}

interface OrganizationResult {
  id: string
  name: string
  source: 'local' | 'pipedrive'
}

interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>
  onSubmit: (values: ContactFormValues) => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  className?: string
  mode?: 'create' | 'edit'
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

export function ContactForm({
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Save Contact',
  cancelLabel = 'Cancel',
  loading = false,
  className,
  mode = 'create'
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormValues>({
    name: '',
    email: '',
    phone: '',
    organisation: '',
    organizationId: undefined,
    warmnessScore: 5,
    ...initialValues
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // --- Organization Autocomplete State ---
  const [orgQuery, setOrgQuery] = useState('')
  const [orgResults, setOrgResults] = useState<OrganizationResult[]>([])
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
  const [orgDropdownCreated, setOrgDropdownCreated] = useState(false)
  const orgDropdownRef = useRef<HTMLDivElement>(null)
  const orgInputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  const debouncedOrgSearch = useRef(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setOrgResults([])
        setOrgLoading(false)
        setOrgError(null)
        return
      }
      setOrgLoading(true)
      setOrgError(null)
      try {
        // Local orgs
        const localRes = await fetch(`/api/organizations?search=${encodeURIComponent(query)}`)
        let localOrgs: OrganizationResult[] = []
        if (localRes.ok) {
          const localData = await localRes.json()
          localOrgs = (localData.data?.organizations || []).map((org: any) => ({
            id: org.id,
            name: org.name,
            source: 'local' as const
          }))
        }
        // Pipedrive orgs
        const pdRes = await fetch('/api/pipedrive/organizations/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        })
        let pdOrgs: OrganizationResult[] = []
        if (pdRes.ok) {
          const pdData = await pdRes.json()
          pdOrgs = (pdData.results || []).map((org: any) => ({
            id: String(org.id),
            name: org.name,
            source: 'pipedrive' as const
          }))
        }
        // Merge, dedupe by name (prefer local)
        const seen = new Set<string>()
        const merged = [...localOrgs, ...pdOrgs.filter(pd => !localOrgs.some(l => l.name.toLowerCase() === pd.name.toLowerCase()))]
        setOrgResults(merged)
        setOrgLoading(false)
      } catch (err) {
        setOrgError('Error searching organizations')
        setOrgResults([])
        setOrgLoading(false)
      }
    }, 400)
  ).current

  // Handle org input changes
  const handleOrgInputChange = (value: string) => {
    setFormData(prev => ({ ...prev, organisation: value, organizationId: undefined }))
    setOrgQuery(value)
    setShowOrgDropdown(true)
    setOrgDropdownCreated(false)
    debouncedOrgSearch(value)
  }

  // Handle org selection
  const handleOrgSelect = (org: OrganizationResult) => {
    setFormData(prev => ({ ...prev, organisation: org.name, organizationId: org.id }))
    setOrgQuery(org.name)
    setShowOrgDropdown(false)
    setOrgDropdownCreated(false)
  }

  // Handle create new org
  const handleCreateNewOrg = async (name: string) => {
    setOrgLoading(true)
    setOrgDropdownCreated(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (res.ok) {
        const data = await res.json()
        setFormData(prev => ({ ...prev, organisation: data.data.name, organizationId: data.data.id }))
        setOrgQuery(data.data.name)
        setShowOrgDropdown(false)
      }
    } finally {
      setOrgLoading(false)
    }
  }

  // Hide dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        orgDropdownRef.current &&
        !orgDropdownRef.current.contains(e.target as Node) &&
        orgInputRef.current &&
        !orgInputRef.current.contains(e.target as Node)
      ) {
        setShowOrgDropdown(false)
      }
    }
    if (showOrgDropdown) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showOrgDropdown])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.warmnessScore !== undefined && (formData.warmnessScore < 0 || formData.warmnessScore > 10)) {
      newErrors.warmnessScore = 'Warmness score must be between 0 and 10'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const isValid = validateForm()
    if (isValid) {
      onSubmit(formData)
    }
  }, [formData, onSubmit, validateForm, errors])

  const handleInputChange = useCallback((field: keyof ContactFormValues, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Only clear error if the new value is valid for that field
    setErrors(prev => {
      const newErrors = { ...prev }
      if (field === 'name' && typeof value === 'string' && value.trim() && newErrors.name) {
        newErrors.name = ''
      }
      if (field === 'email' && typeof value === 'string' && value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && newErrors.email) {
        newErrors.email = ''
      }
      if (field === 'warmnessScore' && typeof value === 'number' && value >= 0 && value <= 10 && newErrors.warmnessScore) {
        newErrors.warmnessScore = ''
      }
      return newErrors
    })
  }, [errors])

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} data-testid="contact-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name *"
          value={formData.name}
          onChange={(value) => handleInputChange('name', value)}
          type="text"
          required
          autoComplete="name"
          error={errors.name}
          placeholder="Enter contact name"
        />
        
        <Input
          label="Email *"
          value={formData.email}
          onChange={(value) => handleInputChange('email', value)}
          type="email"
          required
          autoComplete="email"
          error={errors.email}
          placeholder="Enter email address"
        />
        
        <Input
          label="Phone"
          value={formData.phone || ''}
          onChange={(value) => handleInputChange('phone', value)}
          type="tel"
          autoComplete="tel"
          placeholder="Enter phone number"
        />
        
        {/* Organization Autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-900" htmlFor="org-autocomplete">Organization</label>
          <input
            ref={orgInputRef}
            id="org-autocomplete"
            type="text"
            autoComplete="organization"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 ring-gray-300 px-3 text-sm leading-6"
            placeholder="Enter organization"
            value={formData.organisation || ''}
            onChange={e => handleOrgInputChange(e.target.value)}
            onFocus={() => { if (orgQuery.length >= 3) setShowOrgDropdown(true) }}
            aria-label="Organization"
          />
          {showOrgDropdown && (
            <div ref={orgDropdownRef} className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {orgLoading && (
                <div className="p-2 text-sm text-gray-500">Searching...</div>
              )}
              {orgError && (
                <div className="p-2 text-sm text-red-500">{orgError}</div>
              )}
              {!orgLoading && !orgError && orgResults.length > 0 && (
                <>
                  {orgResults.filter(r => r.source === 'local').length > 0 && (
                    <div className="px-2 pt-2 pb-1 text-xs text-gray-400">Local</div>
                  )}
                  {orgResults.filter(r => r.source === 'local').map(org => (
                    <div key={org.id} className="px-3 py-2 cursor-pointer hover:bg-blue-50" onClick={() => handleOrgSelect(org)}>
                      {org.name} <span className="text-xs text-gray-400">(Local)</span>
                    </div>
                  ))}
                  {orgResults.filter(r => r.source === 'pipedrive').length > 0 && (
                    <div className="px-2 pt-2 pb-1 text-xs text-gray-400">Pipedrive</div>
                  )}
                  {orgResults.filter(r => r.source === 'pipedrive').map(org => (
                    <div key={org.id} className="px-3 py-2 cursor-pointer hover:bg-blue-50" onClick={() => handleOrgSelect(org)}>
                      {org.name} <span className="text-xs text-gray-400">(Pipedrive)</span>
                    </div>
                  ))}
                </>
              )}
              {!orgLoading && !orgError && orgQuery.length >= 3 && orgResults.length === 0 && !orgDropdownCreated && (
                <div className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-blue-600" onClick={() => handleCreateNewOrg(orgQuery)}>
                  Create "{orgQuery}"
                </div>
              )}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Warmness Score
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="10"
              value={formData.warmnessScore || 5}
              onChange={(e) => handleInputChange('warmnessScore', parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700 min-w-[2rem]">
              {formData.warmnessScore || 5}
            </span>
          </div>
          {errors.warmnessScore && (
            <p className="mt-1 text-sm text-red-600">{errors.warmnessScore}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 h-10 px-4 text-base bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent rounded-md"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
} 