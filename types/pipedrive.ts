// Pipedrive API Types
export interface PipedrivePerson {
  id: number
  name: string
  email: Array<{ value: string; primary: boolean; label: string }>
  phone: Array<{ value: string; primary: boolean; label: string }>
  org_id?: number
  org_name?: string
  owner_id?: number
  add_time: string
  update_time: string
  visible_to: number
  picture_id?: number
  label_ids?: number[]
  cc_email: string
}

export interface PipedriveOrganization {
  id: number
  name: string
  people_count: number
  owner_id: number
  address?: string
  visible_to: number
  add_time: string
  update_time: string
  cc_email: string
  label_ids?: number[]
  address_lat?: number
  address_long?: number
  address_subpremise?: string
  address_street_number?: string
  address_route?: string
  address_sublocality?: string
  address_locality?: string
  address_admin_area_level_1?: string
  address_admin_area_level_2?: string
  address_country?: string
  address_postal_code?: string
  address_formatted_address?: string
  website?: string
  industry?: string
  annual_revenue?: string
  employee_count?: number
  picture_id?: number
}

export interface PipedriveCustomField {
  id: number
  key: string
  name: string
  field_type: string
  options?: PipedriveCustomFieldOption[]
}

export interface PipedriveCustomFieldOption {
  id: number
  label: string
  order_nr: number
}

export interface PipedriveActivity {
  id: number
  type: string
  subject: string
  note?: string
  due_date: string
  due_time?: string
  duration?: string
  deal_id?: number
  person_id?: number
  org_id?: number
  user_id: number
  add_time: string
  update_time: string
  done: boolean
}

export interface PipedriveDeal {
  id: number
  title: string
  value: number
  currency: string
  stage_id: number
  person_id?: number
  org_id?: number
  owner_id: number
  add_time: string
  update_time: string
  stage_change_time?: string
  status: string
  visible_to: number
  cc_email: string
}

export interface PipedriveApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  error_info?: string
  additional_data?: {
    pagination?: {
      start: number
      limit: number
      more_items_in_collection: boolean
      next_start?: number
    }
  }
}

export interface PipedriveSearchResponse {
  success: boolean
  data?: {
    items?: Array<{
      item: PipedrivePerson | PipedriveOrganization
      item_type: 'person' | 'organization'
      result_score: number
    }>
  }
  additional_data?: {
    pagination?: {
      start: number
      limit: number
      more_items_in_collection: boolean
      next_start?: number
    }
  }
}

export interface PipedriveUser {
  id: number
  name: string
  email: string
  active_flag: boolean
  timezone_name: string
  timezone_offset: string
  locale: string
  locale_override: boolean
  lang: number
  email_signature?: string
  created: string
  modified: string
  role_id: number
  icon_url?: string
  is_you: boolean
}

export interface PipedriveLabel {
  id: number
  name: string
  color: string
}

export interface PipedriveStage {
  id: number
  name: string
  pipeline_id: number
  order_nr: number
  deal_probability: number
  rotten_flag: boolean
  rotten_days?: number
  add_time: string
  update_time: string
  pipeline_name: string
  pipeline_deal_probability: boolean
}

export interface PipedrivePipeline {
  id: number
  name: string
  url_title: string
  order_nr: number
  active: boolean
  deal_probability: boolean
  add_time: string
  update_time: string
  selected: boolean
  deal_count: number
  won_deals_count: number
  lost_deals_count: number
  open_deals_count: number
  won_deals_value: number
  lost_deals_value: number
  open_deals_value: number
}

// Custom field value types
export interface PipedriveCustomFieldValue {
  [key: string]: string | number | boolean | null
}

// Organization custom fields specific to this app
export interface PipedriveOrganizationCustomFields {
  size?: string
  country?: string
  sector?: string
  [key: string]: string | undefined
}

// Person custom fields specific to this app
export interface PipedrivePersonCustomFields {
  [key: string]: string | undefined
} 