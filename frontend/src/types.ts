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

// Nhật ký toàn cục (GET /api/v1/logs)
export type GlobalLog = {
  event_id: number
  batch_id: string
  status: string
  note: string | null
  created_at: string
}

// Sức khoẻ hệ thống (GET /api/v1/health)
export type Health = {
  status: string
  api: boolean
  db: boolean
  checked_at: string
}

// Một dòng cấu hình (GET /api/v1/config)
export type ConfigItem = {
  config_key: string
  config_value: string
}

// Một luật mapping (GET /api/v1/mappings) — mỗi luật = một cột của file MNT
export type MappingRule = {
  id: number
  record_type: string // FDETL | FDELE | FHEAD | FTAIL
  position: number
  json_field: string
  mnt_column: string
  rule_type: string // DIRECT | DEFAULT | VALUE_MAP | SPLIT
  rule_value: string | null
  data_type: string | null // STRING | NUMBER | DATE (null = field cố định, không kiểm)
  required: boolean
}
