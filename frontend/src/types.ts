// Kiểu dữ liệu khớp DTO của backend (snake_case y như JSON trả về)

export type EventSummary = {
  id: number
  batch_id: string
  version: number
  status: string
  generated_at: string
}

export type EventRecord = {
  change_id: string
  version: number
  item_id: string
  store_id_or_zone: string
  price: number | null
  currency: string | null
  effective_start: string | null
  effective_end: string | null
  change_type: string
  validation_status: string
  set_aside_reason: string | null
  extras: Record<string, unknown> | null
}

export type EventDetail = {
  id: number
  batch_id: string
  version: number
  status: string
  generated_at: string
  retry_count: number
  output_file: string | null
  records: EventRecord[]
}

// Một dòng nhật ký vòng đời batch (GET /api/v1/events/{id}/logs)
export type EventLog = {
  status: string
  note: string | null
  created_at: string
}

// Nội dung file MNT thật (GET /api/v1/events/{id}/file)
export type EventFile = {
  file_name: string | null
  exists: boolean
  content: string | null
  note: string | null
}

// Sức khoẻ hệ thống (GET /api/v1/health)
export type Health = {
  status: string
  api: boolean
  db: boolean
  version: string
  environment: string
  checked_at: string
}

// Metadata cho UI mapping (GET /api/v1/mappings/meta) - để FE không hardcode danh sách
export type MappingMeta = {
  source_fields: string[]
  record_types: string[]
  rule_types: string[]
}

// Một dòng cấu hình (GET /api/v1/config)
export type ConfigItem = {
  config_key: string
  config_value: string
}

// Preview Before/After lấy từ batch thật (GET /api/v1/mappings/preview)
export type MappingPreviewRow = {
  before: Record<string, string>
  fields: Record<string, string> // giá trị đã format sẵn — đầu vào rule engine (để FE tính "after" live)
  record_type: string
  after: string[] | null
  mappable: boolean
  note: string | null
}
export type MappingPreview = {
  business_date: string | null
  batch_id: string | null
  rows: MappingPreviewRow[]
}

// Một luật mapping (GET /api/v1/mappings) - mỗi luật = một cột của file MNT
export type MappingRule = {
  id: number
  record_type: string // FDETL | FDELE | FHEAD | FTAIL
  position: number
  json_field: string
  mnt_column: string
  rule_type: string // DIRECT | DEFAULT | VALUE_MAP | SPLIT
  rule_value: string | null
  required: boolean
  locked: boolean // cột chuẩn (hợp đồng Oracle) — khoá cứng: không đổi nguồn / xoá
}
