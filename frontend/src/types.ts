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
  item_id: string
  store_id_or_zone: string
  validation_status: string
  set_aside_reason: string | null
}

export type EventDetail = {
  id: number
  batch_id: string
  version: number
  status: string
  generated_at: string
  records: EventRecord[]
}

// Một dòng nhật ký vòng đời batch (GET /api/v1/events/{id}/logs)
export type EventLog = {
  status: string
  note: string | null
  created_at: string
}

// Một dòng cấu hình (GET /api/v1/config)
export type ConfigItem = {
  config_key: string
  config_value: string
}

// Một luật mapping (GET /api/v1/mappings) — mỗi luật = một cột của file MNT
export type MappingRule = {
  id: number
  record_type: string // FDETL | FDELE
  position: number
  json_field: string
  mnt_column: string
  rule_type: string // DIRECT | DEFAULT | VALUE_MAP | SPLIT
  rule_value: string | null
  data_type: string | null // STRING | NUMBER | DATE (null = field cố định, không kiểm)
  required: boolean
}
