import { useState, useEffect, type ReactNode } from 'react'
import type { MappingRule } from '../types'

// Tab "Mappings" — sổ đăng ký field: mỗi dòng = một cột của file MNT.
// Field phải khai ở đây TRƯỚC thì HQ gửi qua API hệ thống mới hiểu + in ra. Đã nối API thật (GET/POST/DELETE).

// Loại quy tắc: chỉ chữ màu trầm, không nền
const RULE_TYPE_STYLES: Record<string, string> = {
  DIRECT: 'text-zinc-400',
  DEFAULT: 'text-amber-400',
  VALUE_MAP: 'text-teal-400',
  SPLIT: 'text-sky-400',
}

function RuleTypeTag({ type }: { type: string }) {
  const style = RULE_TYPE_STYLES[type] ?? 'text-zinc-400'
  return <span className={'font-mono text-[10px] uppercase tracking-widest ' + style}>{type}</span>
}

// Cột CHUẨN — khớp các getter cứng trong Mapper.buildFields. Đây là cột trong hợp đồng Oracle
// (thứ tự cố định), xoá sẽ lệch file → KHÔNG cho xoá trên UI.
const STANDARD_FIELDS = new Set([
  'item_id',
  'store_id_or_zone',
  'price',
  'currency',
  'effective_start',
  'effective_end',
])

// Ổ khoá vẽ bằng SVG (không dùng icon lib) — báo dòng này bị khoá, không xoá được
function LockIcon() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.1">
      <rect x="2.5" y="5.3" width="7" height="4.7" rx="1" />
      <path d="M4 5.3V4a2 2 0 0 1 4 0v1.3" strokeLinecap="round" />
    </svg>
  )
}

// Ô form (label trên + control dưới) — khai NGOÀI component để nhập không mất focus
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// Record mẫu để dựng dòng output xem trước
const SAMPLE_RECORD: Record<string, string> = {
  item_id: 'SKU900',
  store_id_or_zone: 'STORE_001',
  price: '50000',
  currency: '',
  effective_start: '2026-07-20',
  effective_end: '',
}

// Áp một luật lên record mẫu → giá trị ô đó (mini-Mapper để xem trước)
function applyRule(rule: MappingRule, sample: Record<string, string>): string {
  const raw = sample[rule.json_field] ?? ''
  if (rule.rule_type === 'DEFAULT') {
    return raw !== '' ? raw : rule.rule_value ?? ''
  }
  if (rule.rule_type === 'VALUE_MAP') {
    try {
      const map = JSON.parse(rule.rule_value ?? '{}') as Record<string, string>
      return map[raw.split('_')[0].toUpperCase()] ?? '?'
    } catch {
      return '?'
    }
  }
  if (rule.rule_type === 'SPLIT') {
    const idx = raw.indexOf('_')
    return idx >= 0 ? raw.slice(idx + 1) : ''
  }
  return raw
}

// Dòng output ví dụ mà bộ luật của record_type này sẽ in ra (nhân vật chính của panel)
function OutputLine({ rules, recordType }: { rules: MappingRule[]; recordType: string }) {
  const ofType = rules.filter((r) => r.record_type === recordType).sort((a, b) => a.position - b.position)
  if (ofType.length === 0) {
    return null
  }
  // Ghép ĐÚNG các cột có luật theo thứ tự position — khớp Mapper backend (KHÔNG chèn ô trống cho khoảng vị trí)
  const parts = ofType.map((rule) => applyRule(rule, SAMPLE_RECORD))
  return (
    <code className="block font-mono text-[13px] text-emerald-400/80 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2.5 overflow-x-auto">
      {recordType + ',' + parts.join(',')}
    </code>
  )
}

export function MappingsTab() {
  const [rules, setRules] = useState<MappingRule[]>([])

  // Form thêm luật
  const [recordType, setRecordType] = useState('FDETL')
  const [position, setPosition] = useState('')
  const [jsonField, setJsonField] = useState('')
  const [mntColumn, setMntColumn] = useState('')
  const [ruleType, setRuleType] = useState('DIRECT')
  const [ruleValue, setRuleValue] = useState('')
  const [dataType, setDataType] = useState('')
  const [required, setRequired] = useState(false)

  const recordTypes = ['FDETL', 'FDELE']

  function loadRules() {
    fetch('/api/v1/mappings')
      .then((response) => response.json())
      .then((data: MappingRule[]) => setRules(data))
  }

  useEffect(() => {
    loadRules()
  }, [])

  function addRule() {
    const pos = Number(position)
    if (jsonField.trim() === '' || Number.isNaN(pos) || pos < 1) {
      return
    }
    const body = {
      record_type: recordType,
      position: pos,
      json_field: jsonField.trim(),
      mnt_column: mntColumn.trim() || jsonField.trim().toUpperCase(),
      rule_type: ruleType,
      rule_value: ruleType === 'DIRECT' ? null : ruleValue.trim() || null,
      data_type: dataType || null,
      required: required,
    }
    fetch('/api/v1/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(() => {
      loadRules()
      setPosition('')
      setJsonField('')
      setMntColumn('')
      setRuleValue('')
      setDataType('')
      setRequired(false)
    })
  }

  function removeRule(id: number) {
    fetch('/api/v1/mappings/' + id, { method: 'DELETE' }).then(() => loadRules())
  }

  const inputClass =
    'font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 h-10 text-zinc-100 placeholder:text-zinc-600 hover:border-zinc-600 focus:outline-none focus:border-zinc-400 focus:bg-zinc-800/80'

  return (
    <div>
      {/* Lời dẫn — một câu */}
      <p className="text-lg text-zinc-400 mb-10 max-w-3xl">
        Each row is one column of the MNT file. A field must be <span className="text-zinc-200">declared here first</span> before
        the system understands and emits it.
      </p>

      {/* Hai loại dòng cạnh nhau — card đều chiều cao (grid stretch) */}
      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        {recordTypes.map((rt) => {
          const group = rules
            .filter((r) => r.record_type === rt)
            .sort((a, b) => a.position - b.position)
          if (group.length === 0) {
            return null
          }
          return (
            <div key={rt} className="flex flex-col">
              {/* Tiêu đề + dòng output NẰM NGOÀI card, chữ to */}
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="text-lg font-semibold uppercase tracking-wider text-zinc-100">{rt}</h3>
                <span className="text-xs text-zinc-600">
                  {rt === 'FDETL' ? 'new · update' : 'delete'} · {group.length} columns
                </span>
              </div>

              <OutputLine rules={rules} recordType={rt} />

              {/* Card = danh sách luật (cao bằng nhau nhờ flex-1 + grid stretch) */}
              <div className="border border-zinc-800 rounded-xl px-5 mt-4 flex-1 divide-y divide-zinc-800/50">
                {group.map((rule) => (
                  <div key={rule.id} className="group flex items-center gap-3 py-2.5 text-sm">
                    <span className="w-5 shrink-0 font-mono text-xs text-zinc-600 tabular-nums">{rule.position}</span>
                    <span className="w-40 shrink-0 font-mono text-zinc-200 truncate">{rule.json_field}</span>
                    <span className="shrink-0 text-zinc-600">→</span>
                    <span className="flex-1 min-w-0 font-mono text-zinc-500 truncate">{rule.mnt_column}</span>
                    <span className="w-24 shrink-0 text-right">
                      <RuleTypeTag type={rule.rule_type} />
                    </span>
                    {STANDARD_FIELDS.has(rule.json_field) ? (
                      // cột chuẩn (hợp đồng Oracle) → khoá, không cho xoá
                      <span
                        className="w-4 shrink-0 flex items-center justify-center text-zinc-700 cursor-not-allowed"
                        title="Standard column (Oracle contract) — cannot be removed"
                      >
                        <LockIcon />
                      </span>
                    ) : (
                      // field tự thêm → cho xoá
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="w-4 shrink-0 text-zinc-700 hover:text-red-400 leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove rule"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Thêm luật — luôn hiện đầy đủ */}
      <div className="border-t border-zinc-800/60 pt-8 mt-12">
        <div>
          <h3 className="text-xs uppercase tracking-[0.25em] text-zinc-300 mb-5">Add rule</h3>
          <div className="space-y-4">
              {/* 6 field đều nhau trên một lưới */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                <Field label="record_type">
                  <select value={recordType} onChange={(e) => setRecordType(e.target.value)} className={inputClass + ' w-full'}>
                    <option value="FDETL">FDETL</option>
                    <option value="FDELE">FDELE</option>
                  </select>
                </Field>
                <Field label="position">
                  <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="8" className={inputClass + ' w-full'} />
                </Field>
                <Field label="json_field">
                  <input value={jsonField} onChange={(e) => setJsonField(e.target.value)} placeholder="promo_code" className={inputClass + ' w-full'} />
                </Field>
                <Field label="mnt_column">
                  <input value={mntColumn} onChange={(e) => setMntColumn(e.target.value)} placeholder="PROMO" className={inputClass + ' w-full'} />
                </Field>
                <Field label="rule_type">
                  <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className={inputClass + ' w-full'}>
                    <option value="DIRECT">DIRECT</option>
                    <option value="DEFAULT">DEFAULT</option>
                    <option value="VALUE_MAP">VALUE_MAP</option>
                    <option value="SPLIT">SPLIT</option>
                  </select>
                </Field>
                <Field label="data_type">
                  <select value={dataType} onChange={(e) => setDataType(e.target.value)} className={inputClass + ' w-full'}>
                    <option value="">—</option>
                    <option value="STRING">STRING</option>
                    <option value="NUMBER">NUMBER</option>
                    <option value="DATE">DATE</option>
                  </select>
                </Field>
              </div>

              {/* rule_value — xuống dòng full-width, chỉ khi cần */}
              {(ruleType === 'DEFAULT' || ruleType === 'VALUE_MAP') && (
                <Field label={ruleType === 'DEFAULT' ? 'rule_value' : 'rule_value (JSON)'}>
                  <input
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    placeholder={ruleType === 'DEFAULT' ? 'VND' : '{"STORE":"S","ZONE":"Z"}'}
                    className={inputClass + ' w-full'}
                  />
                </Field>
              )}

              {/* hàng action: required trái · Thêm phải */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                  <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
                  required
                </label>
                <button
                  onClick={addRule}
                  className="text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-white rounded-lg px-5 py-2"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}
