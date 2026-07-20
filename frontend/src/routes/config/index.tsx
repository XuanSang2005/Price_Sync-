import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, type ReactNode } from 'react'
import type { ConfigItem } from '../../types'
import { MappingsTab } from '../../components/MappingsTab'

// "/config" — trang cấu hình theo bố cục TDD (Connections / Mappings / Processing).
// Nguyên tắc TRUNG THỰC: field nào có config_key trong DB → sửa + lưu được thật;
// field nào chưa seed vào DB → khóa (disabled) + tag "chưa nối DB", placeholder là giá trị minh họa.
// Sau này seed thêm key vào bảng config là field tự mở khóa, không cần sửa UI.
export const Route = createFileRoute('/config/')({
  component: ConfigPage,
})

// ===== Khai báo field: mỗi field trỏ vào một config_key trong DB =====
type FieldDef = {
  configKey: string
  label: string
  placeholder: string // giá trị minh họa khi key chưa có trong DB
  note?: string // chú thích dưới ô
}

// Tab Connections — thẻ Xcenter output
const XCENTER_FIELDS: FieldDef[] = [
  { configKey: 'xcenter_inbound_path', label: 'Inbound path', placeholder: '/mnt/xcenter/inbound' },
  {
    configKey: 'filename_pattern',
    label: 'Filename pattern',
    placeholder: 'pricesync_<batch_id>_v<version>_<ts>.mnt',
  },
]

// Tab Processing — config ĐANG SỐNG thật trong DB
const PROCESSING_FIELDS: FieldDef[] = [
  {
    configKey: 'abort_threshold',
    label: 'Abort threshold',
    placeholder: '0.2',
    note: 'Exceeding this set-aside rate → batch FAILED (0.2 = 20%).',
  },
]

// ===== Một ô nhập cấu hình (khai báo NGOÀI component trang để không bị mất focus khi gõ) =====
function ConfigField({
  field,
  value,
  exists,
  onChange,
  centerLabel,
}: {
  field: FieldDef
  value: string
  exists: boolean // key có trong DB không → quyết định sửa được hay khóa
  onChange: (newValue: string) => void
  centerLabel?: boolean // căn giữa nhãn (dùng cho 2 ô Xcenter dưới khối 3D)
}) {
  return (
    <div>
      <div className={'flex items-center gap-2 mb-1.5' + (centerLabel ? ' justify-center' : '')}>
        <label className="text-sm text-zinc-400">{field.label}</label>
        {!exists && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">not in DB</span>
        )}
      </div>
      <input
        value={value}
        disabled={!exists}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={
          'w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-600 hover:border-zinc-600 focus:outline-none focus:border-zinc-400 focus:bg-zinc-800/80 disabled:opacity-50 disabled:cursor-not-allowed' +
          (centerLabel ? ' text-center' : '')
        }
      />
      {field.note !== undefined && <p className="text-xs text-zinc-600 mt-1.5">{field.note}</p>}
    </div>
  )
}

// Chip 1 địa chỉ IP trong allowlist (có nút × để gỡ)
function IpChip({ ip, onRemove, canEdit }: { ip: string; onRemove: () => void; canEdit: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm text-zinc-100 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5">
      {ip}
      {canEdit && (
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400">
          ×
        </button>
      )}
    </span>
  )
}

// Vỏ khối 3D dùng chung: nền gradient + viền sáng trên + đế đặc 10px (bề dày). Quầng màu do từng khối tự thêm.
const BLOCK_3D =
  'w-40 h-32 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border-t border-zinc-700/60 ' +
  'flex items-center justify-center transition-transform hover:-translate-y-1'

// Khối 3D tượng trưng THƯ MỤC (folder) — tông XANH DƯƠNG + quầng xanh
function FolderBlock3D() {
  return (
    <div className={BLOCK_3D + ' shadow-[0_10px_0_0_#0a0a0c,0_20px_32px_-6px_rgba(96,165,250,0.30)]'}>
      <div className="relative w-20 h-14 drop-shadow-md">
        <div className="absolute -top-2.5 left-0 h-4 w-9 rounded-t-lg bg-blue-500" />
        <div className="absolute inset-x-0 bottom-0 top-1 rounded-lg bg-gradient-to-b from-blue-400 to-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" />
      </div>
    </div>
  )
}

// Khối 3D tượng trưng FILE theo pattern (document) — tông HỒNG (rose) + quầng hồng
function FileBlock3D() {
  return (
    <div className={BLOCK_3D + ' shadow-[0_10px_0_0_#0a0a0c,0_20px_32px_-6px_rgba(251,113,133,0.30)]'}>
      <div className="relative w-14 h-16 rounded-md rounded-tr-none bg-gradient-to-b from-rose-300 to-rose-500 drop-shadow-md">
        <div className="absolute top-0 right-0 h-5 w-5 bg-zinc-900 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
        <div className="absolute left-2 right-3 top-6 h-1 rounded bg-rose-900/40" />
        <div className="absolute left-2 right-2 top-8 h-1 rounded bg-rose-900/40" />
        <div className="absolute left-2 right-4 top-10 h-1 rounded bg-rose-900/40" />
      </div>
    </div>
  )
}

// Mũi tên nối giữa các chốt (chỉ hiện khi xếp ngang trên màn rộng)
function GateArrow() {
  return <div className="hidden xl:flex items-center text-zinc-600 text-lg select-none">→</div>
}

// Ổ khoá nhỏ vẽ bằng CSS thuần (đánh dấu lớp secret nằm ở env var)
function Padlock() {
  return (
    <span className="relative inline-block w-3.5 h-4 align-middle">
      <span className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-t-full border-[1.5px] border-b-0 border-zinc-500" />
      <span className="absolute bottom-0 inset-x-0 h-2.5 rounded-[3px] bg-zinc-500" />
    </span>
  )
}

// Một CHỐT của cổng bảo mật: số thứ tự + tên lớp + mã lỗi khi chặn + nội dung
function GateCard({
  n,
  title,
  code,
  className,
  children,
}: {
  n: number
  title: string
  code: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={
        'bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col ' +
        'shadow-[0_8px_18px_-8px_rgba(0,0,0,0.55)] transition-shadow hover:shadow-[0_10px_22px_-8px_rgba(0,0,0,0.7)] ' +
        (className ?? 'xl:flex-1')
      }
    >
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 font-mono text-[9px] text-zinc-400">
            {n}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-300">{title}</span>
        </span>
        <span className="font-mono text-[10px] text-red-400/70">{code}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center">{children}</div>
    </div>
  )
}

// Kiểm filename pattern: BẮT BUỘC đuôi .mnt (Xstore mới nhặt) + NÊN có <ts> để tên file không trùng.
// Trả về chuỗi lỗi, hoặc null nếu hợp lệ.
function validateFilenamePattern(pattern: string): string | null {
  if (!/\.mnt$/.test(pattern)) {
    return 'Must end with .mnt'
  }
  if (!pattern.includes('<ts>')) {
    return 'Missing <ts> — files may collide'
  }
  return null
}

function ConfigPage() {
  const [values, setValues] = useState<Record<string, string>>({}) // giá trị THẬT trong DB
  const [drafts, setDrafts] = useState<Record<string, string>>({}) // giá trị đang sửa
  const [activeTab, setActiveTab] = useState<'connections' | 'mappings' | 'processing'>('connections')
  const [ipInput, setIpInput] = useState('') // ô "add address…"
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('') // thông báo sau khi lưu

  // Tải toàn bộ config từ DB → đổ vào values + drafts
  function loadConfigs() {
    fetch('/api/v1/config')
      .then((response) => response.json())
      .then((data: ConfigItem[]) => {
        const map: Record<string, string> = {}
        for (const item of data) {
          map[item.config_key] = item.config_value
        }
        setValues(map)
        setDrafts(map)
      })
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  // key có trong DB không?
  function exists(key: string) {
    return key in values
  }

  // giá trị hiển thị của một key (draft nếu đang sửa, rỗng nếu chưa có)
  function draftOf(key: string) {
    return drafts[key] ?? ''
  }

  function handleChange(key: string, newValue: string) {
    setDrafts({ ...drafts, [key]: newValue })
  }

  // ===== IP allowlist: lưu trong DB dạng chuỗi "ip1,ip2" → UI tách thành chips =====
  const ipListKey = 'ip_allowlist'
  const ipList = draftOf(ipListKey)
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip !== '')

  function addIp() {
    if (ipInput.trim() === '') {
      return
    }
    const newList = [...ipList, ipInput.trim()]
    handleChange(ipListKey, newList.join(','))
    setIpInput('')
  }

  function removeIp(index: number) {
    const newList = ipList.filter((_, i) => i !== index)
    handleChange(ipListKey, newList.join(','))
  }

  // ===== Lưu: PUT từng key ĐÃ CÓ trong DB mà giá trị bị sửa =====
  const dirtyKeys = Object.keys(drafts).filter(
    (key) => exists(key) && drafts[key] !== values[key]
  )

  // Lỗi filename pattern (nếu có) — dùng để hiện cảnh báo + chặn Save
  const filenamePatternError =
    exists('filename_pattern') && draftOf('filename_pattern') !== ''
      ? validateFilenamePattern(draftOf('filename_pattern'))
      : null

  function handleSave() {
    setSaving(true)
    setMessage('')

    // gửi tất cả key bị sửa song song, đợi xong hết
    const requests = dirtyKeys.map((key) =>
      fetch('/api/v1/config/' + key, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_value: drafts[key] }),
      })
    )
    Promise.all(requests)
      .then((responses) => {
        const allOk = responses.every((response) => response.ok)
        setSaving(false)
        setMessage(allOk ? 'Saved ✓' : 'Some keys failed to save — check the backend')
        loadConfigs()
      })
      .catch(() => {
        setSaving(false)
        setMessage('Save failed — cannot reach the backend')
      })
  }

  // Tab: mono chữ hoa giãn cách, active gạch chân (đồng bộ với tab ở trang Events)
  function Tab({ id, label }: { id: typeof activeTab; label: string }) {
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={
          'font-mono text-xs uppercase tracking-[0.25em] pb-2 border-b ' +
          (activeTab === id
            ? 'text-zinc-100 border-zinc-100'
            : 'text-zinc-500 border-transparent hover:text-zinc-300')
        }
      >
        {label}
      </button>
    )
  }

  return (
    // full width như trang Events/Dashboard (fill trọn max-w-screen-2xl của <main>, không chừa 2 bên)
    <div>
      {/* ===== Tabs (không cần tiêu đề — nav đã ghi Config) ===== */}
      <div className="flex items-center gap-8 border-b border-zinc-800/60 mb-10">
        <Tab id="connections" label="Connections" />
        <Tab id="mappings" label="Mappings" />
        <Tab id="processing" label="Processing" />
      </div>

      {/* ===== Tab Connections: Row 1 = 2 khối 3D (folder | filename) + placeholder; Row 2 = HQ intake ===== */}
      {activeTab === 'connections' && (
        <div className="space-y-14">
          {/* --- Row 1: 2 khối 3D (folder | filename) canh GIỮA page, dưới mỗi khối là ô placeholder --- */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-24 max-w-5xl mx-auto">
              {/* Khối folder + ô inbound path */}
              <div className="flex flex-col gap-7">
                <div className="flex justify-center pt-2">
                  <FolderBlock3D />
                </div>
                <ConfigField
                  field={XCENTER_FIELDS[0]}
                  value={draftOf('xcenter_inbound_path')}
                  exists={exists('xcenter_inbound_path')}
                  onChange={(v) => handleChange('xcenter_inbound_path', v)}
                  centerLabel
                />
              </div>

              {/* Khối file/pattern + ô filename pattern */}
              <div className="flex flex-col gap-7">
                <div className="flex justify-center pt-2">
                  <FileBlock3D />
                </div>
                <ConfigField
                  field={XCENTER_FIELDS[1]}
                  value={draftOf('filename_pattern')}
                  exists={exists('filename_pattern')}
                  onChange={(v) => handleChange('filename_pattern', v)}
                  centerLabel
                />
                {filenamePatternError !== null && (
                  <p className="mt-2 text-xs text-red-400">{filenamePatternError}</p>
                )}
              </div>
            </div>
          </section>

          {/* --- Row 2: HQ intake --- */}
          <section className="border-t border-zinc-800/60 pt-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-100">HQ intake</h2>
            <p className="text-sm text-zinc-600 mt-1.5 mb-8 font-mono">
              POST /api/v1/price-events · each request passes through 4 security layers
            </p>

            {/* Cổng 4 chốt: request đi qua theo đúng thứ tự filter chain → 202 */}
            <div className="flex flex-col xl:flex-row xl:items-stretch gap-4">
              {/* ① IP allowlist — sửa được */}
              <GateCard n={1} title="IP allowlist" code="403" className="xl:flex-[1.4]">
                <div className="flex flex-wrap items-center gap-2">
                  {ipList.map((ip, index) => (
                    <IpChip key={index} ip={ip} onRemove={() => removeIp(index)} canEdit={exists(ipListKey)} />
                  ))}
                  <input
                    value={ipInput}
                    disabled={!exists(ipListKey)}
                    placeholder="add IP…"
                    onChange={(e) => setIpInput(e.target.value)}
                    className="font-mono text-sm bg-zinc-900/60 border border-dashed border-zinc-600 rounded-lg px-3 py-1.5 text-zinc-100 placeholder:text-zinc-500 w-28 focus:outline-none focus:border-zinc-400 disabled:opacity-50"
                  />
                  <button
                    onClick={addIp}
                    disabled={!exists(ipListKey)}
                    className="text-sm font-medium text-zinc-200 border border-zinc-700 rounded-lg px-3 py-1.5 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-3 text-xs text-zinc-600">Only allowlisted IPs may call.</p>
              </GateCard>

              <GateArrow />

              {/* ② Timestamp — sửa được */}
              <GateCard n={2} title="Timestamp" code="401">
                <div className="flex items-baseline gap-2">
                  <input
                    value={draftOf('replay_skew_min')}
                    disabled={!exists('replay_skew_min')}
                    onChange={(e) => handleChange('replay_skew_min', e.target.value)}
                    placeholder="5"
                    className="w-16 text-center font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-zinc-100 placeholder:text-zinc-600 hover:border-zinc-600 focus:outline-none focus:border-zinc-400 disabled:opacity-50"
                  />
                  <span className="text-sm text-zinc-500">± min</span>
                </div>
                <p className="mt-3 text-xs text-zinc-600">Replay window.</p>
              </GateCard>

              <GateArrow />

              {/* ③ HMAC — secret ở env var */}
              <GateCard n={3} title="HMAC" code="401">
                <div className="flex items-center gap-2">
                  <Padlock />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400/80">env var</span>
                </div>
                <p className="mt-3 text-xs text-zinc-600">HMAC-SHA256 signature. Secret never passes through the console.</p>
              </GateCard>

              <GateArrow />

              {/* ④ API key — secret ở env var */}
              <GateCard n={4} title="API key" code="401">
                <div className="flex items-center gap-2">
                  <Padlock />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400/80">env var</span>
                </div>
                <p className="mt-3 text-xs text-zinc-600">Header X-Api-Key. Secret never passes through the console.</p>
              </GateCard>

              <GateArrow />

              {/* Qua hết 4 lớp → chấp nhận 202 */}
              <div className="flex xl:flex-col items-center justify-center">
                <span className="font-mono text-sm text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 rounded-lg px-3 py-2">
                  202
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ===== Tab Mappings: sổ đăng ký field (preview — mảnh 4 nối API) ===== */}
      {activeTab === 'mappings' && <MappingsTab />}

      {/* ===== Tab Processing: config đang sống thật (ô cấu hình | giải thích) ===== */}
      {activeTab === 'processing' && (
        <div className="grid lg:grid-cols-2">
          <section className="lg:pr-16">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-100 mb-7">Processing rules</h2>
            <div className="space-y-5 max-w-xs">
              {PROCESSING_FIELDS.map((field) => (
                <ConfigField
                  key={field.configKey}
                  field={field}
                  value={draftOf(field.configKey)}
                  exists={exists(field.configKey)}
                  onChange={(newValue) => handleChange(field.configKey, newValue)}
                />
              ))}
            </div>
          </section>
          <aside className="lg:border-l lg:border-zinc-800/60 lg:pl-16 text-sm text-zinc-500 leading-relaxed space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-100 mb-2">Abort threshold</h2>
            <p>
              When a batch's <span className="text-zinc-300">set-aside</span> rate exceeds this threshold,
              the whole batch turns <span className="text-red-400">FAILED</span> instead of producing a partial file.
            </p>
            <p>
              <span className="font-mono text-zinc-400">0.2</span> = 20%: 3/10 bad records (30%) →{' '}
              <span className="text-red-400">FAILED</span>; 1/10 (10%) → still produces a file, batch{' '}
              <span className="text-orange-400">PARTIAL</span>.
            </p>
          </aside>
        </div>
      )}

      {/* ===== Thanh lưu dưới cùng (flat, hairline) ===== */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 pt-6 mt-16">
        <span className="text-sm text-zinc-500">
          {Object.keys(values).length} configs in DB
        </span>
        <div className="flex items-center gap-4">
          {message !== '' && (
            <span
              className={
                'text-sm font-medium ' +
                (message === 'Saved ✓' ? 'text-emerald-400' : 'text-red-400')
              }
            >
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={dirtyKeys.length === 0 || saving || filenamePatternError !== null}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
