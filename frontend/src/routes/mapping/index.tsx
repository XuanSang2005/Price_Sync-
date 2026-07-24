import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import type { MappingRule, MappingPreview, MappingMeta } from '../../types'
import { PlusIcon, XIcon, CheckIcon, SearchIcon, ArrowRightIcon, SaveIcon, ChevronUpIcon, ChevronDownIcon } from '../../components/icons'

export const Route = createFileRoute('/mapping/')({ component: MappingPage })

function ruleTagCls(t: string) {
  const m: Record<string, string> = {
    DIRECT: 'text-muted bg-surface2', DEFAULT: 'text-amber bg-amber-bg',
    VALUE_MAP: 'text-accent bg-accent-weak', SPLIT: 'text-green bg-green-bg',
  }
  return m[t] ?? 'text-muted bg-surface2'
}

// Một cột MNT đang chỉnh (bản nháp cục bộ, chỉ ghi DB khi bấm Save)
type Col = {
  key: string
  json_field: string
  mnt_column: string
  rule_type: string
  rule_value: string | null
  required: boolean
  locked: boolean // cột chuẩn (hợp đồng Oracle) — khoá cứng: không đổi nguồn, không xoá. Gắn lúc load, KHÔNG suy từ json_field.
}
type Line = { key: string; x1: number; y1: number; x2: number; y2: number }

let KEY = 1
function colFromRule(r: MappingRule): Col {
  return {
    key: 'r' + r.id, json_field: r.json_field, mnt_column: r.mnt_column, rule_type: r.rule_type,
    rule_value: r.rule_value, required: r.required, locked: r.locked,
  }
}

// Rule engine chạy TRÊN FRONTEND — khớp Mapper.applyRule của backend, áp lên `fields` (đã format sẵn).
// Nhờ vậy bảng "After" cập nhật LIVE theo cột nháp, không cần Save. null = một luật báo không map được.
function computeAfter(fields: Record<string, string>, columns: Col[]): string[] | null {
  const src = fields ?? {} // backend cũ (chưa restart) không có `fields` → tránh crash
  const out: string[] = []
  for (const c of columns) {
    const raw = src[c.json_field]
    let v: string | null
    switch (c.rule_type) {
      case 'DIRECT':
        v = raw ?? ''
        break
      case 'DEFAULT':
        v = raw && raw !== '' ? raw : (c.rule_value ?? '')
        break
      case 'VALUE_MAP': {
        if (raw == null) { v = null; break }
        const prefix = raw.split('_')[0].toUpperCase()
        let m: Record<string, string> = {}
        try { m = c.rule_value ? JSON.parse(c.rule_value) : {} } catch { m = {} }
        v = prefix in m ? m[prefix] : null
        break
      }
      case 'SPLIT': {
        if (raw == null) { v = null; break }
        const i = raw.indexOf('_')
        v = i >= 0 ? raw.slice(i + 1) : ''
        break
      }
      default:
        v = raw ?? ''
    }
    if (v === null) return null
    out.push(v)
  }
  return out
}

function MappingPage() {
  const [rules, setRules] = useState<MappingRule[]>([])
  const [meta, setMeta] = useState<MappingMeta | null>(null)
  const [recordType, setRecordType] = useState('FDETL')
  const [cols, setCols] = useState<Col[]>([])
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState<MappingPreview | null>(null)
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null)
  const [dragSrc, setDragSrc] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [adding, setAdding] = useState(false)
  const [newCol, setNewCol] = useState({ json_field: '', mnt_column: '', required: false, nameEdited: false })
  const [addingSrc, setAddingSrc] = useState(false)
  const [newSrc, setNewSrc] = useState('')
  const [customSources, setCustomSources] = useState<string[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const lastMapRef = useRef(0) // mốc thời gian vừa map xong → chặn double-click gỡ nhầm ngay sau khi đặt nguồn

  const load = useCallback(() => {
    fetch('/api/v1/mappings').then((r) => r.json()).then(setRules).catch(() => {})
    fetch('/api/v1/mappings/meta').then((r) => r.json()).then(setMeta).catch(() => {})
    fetch('/api/v1/mappings/preview').then((r) => r.json()).then(setPreview).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  // Khi rules/recordType đổi → dựng lại cột nháp (theo position), reset dirty
  useEffect(() => {
    if (dirty) return // đừng đè sửa CHƯA LƯU (đổi tab / auto-reload không nuốt edit); locked lấy từ server r.locked
    const list = rules.filter((r) => r.record_type === recordType).sort((a, b) => a.position - b.position).map(colFromRule)
    setCols(list)
  }, [rules, recordType, dirty])

  // Đang chọn nguồn (click-to-map) → Esc hoặc click ra ngoài panel để huỷ.
  useEffect(() => {
    if (!selectedSrc) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedSrc(null) }
    const onDown = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setSelectedSrc(null) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [selectedSrc])

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2600) }

  // ===== Danh sách ĐỘNG từ backend meta (không hardcode) =====
  const ruleTypes = meta?.rule_types ?? []
  const recordTypes = meta?.record_types ?? []

  // Nguồn: source_fields động (reflection + extras) + field thấy trong preview thật
  const previewFields = preview?.rows?.[0] ? Object.keys(preview.rows[0].before) : []
  const sources = [...new Set([...(meta?.source_fields ?? []), ...previewFields, ...customSources,
    ...cols.map((c) => c.json_field).filter(Boolean)])] // gồm field của cột đã map → không biến mất sau Save
  const usedSet = new Set(cols.map((c) => c.json_field))
  const q = search.trim().toLowerCase()
  const shownSources = sources.filter((s) => !q || s.toLowerCase().includes(q))

  // ===== Gán nguồn vào một cột =====
  function mapSource(colKey: string, src: string) {
    if (cols.find((c) => c.key === colKey)?.locked) { // cột chuẩn: item_id khoá cứng với ITEM, không cho đổi nguồn
      showToast('Standard column (Oracle contract) - source is fixed')
      setSelectedSrc(null)
      return
    }
    setCols((cs) => cs.map((c) => (c.key === colKey ? { ...c, json_field: src } : c)))
    setDirty(true)
    setSelectedSrc(null)
    lastMapRef.current = Date.now()
  }
  function clearCol(colKey: string) {
    setCols((cs) => cs.map((c) => (c.key === colKey ? { ...c, json_field: '' } : c)))
    setDirty(true)
  }
  function removeCol(colKey: string) {
    setCols((cs) => cs.filter((c) => c.key !== colKey))
    setDirty(true)
  }
  function moveCol(i: number, dir: -1 | 1) {
    setCols((cs) => {
      const j = i + dir
      if (j < 0 || j >= cs.length) return cs
      if (cs[i].locked || cs[j].locked) return cs // không đổi vị trí liên quan cột chuẩn
      const next = [...cs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setDirty(true)
  }
  function setColField(colKey: string, patch: Partial<Col>) {
    setCols((cs) => cs.map((c) => (c.key === colKey ? { ...c, ...patch } : c)))
    setDirty(true)
  }
  // Gõ JSON field → tự sinh tên MNT (UPPERCASE). Ngừng sync khi user tự sửa tên MNT.
  function onJsonFieldChange(v: string) {
    setNewCol((n) => ({
      ...n,
      json_field: v,
      mnt_column: n.nameEdited ? n.mnt_column : v.trim().toUpperCase().replace(/\s+/g, '_'),
    }))
  }
  function addColumn() {
    const jf = newCol.json_field.trim()
    if (!jf) { showToast('Enter a JSON field'); return }
    const mnt = (newCol.mnt_column.trim() || jf.toUpperCase()).replace(/\s+/g, '_')
    if (cols.some((c) => c.mnt_column === mnt)) { showToast('Column ' + mnt + ' already exists'); return }
    setCols((cs) => [...cs, {
      key: 'c' + (KEY++), json_field: jf, mnt_column: mnt,
      rule_type: 'DIRECT', rule_value: null, required: newCol.required, locked: false,
    }])
    setNewCol({ json_field: '', mnt_column: '', required: false, nameEdited: false })
    setAdding(false)
    setDirty(true)
  }
  // Khai một field nguồn MỚI (chỉ là ứng viên kéo được; thành luật thật khi map + Save)
  function addSource() {
    const name = newSrc.trim().replace(/\s+/g, '_')
    if (!name) { showToast('Enter a field name'); return }
    setCustomSources((cs) => [...new Set([...cs, name])])
    setNewSrc('')
    setAddingSrc(false)
  }
  // Xoá một field nguồn TỰ THÊM (chỉ những field trong customSources). Field chuẩn/preview là field thật, không xoá.
  function removeSource(name: string) {
    setCustomSources((cs) => cs.filter((x) => x !== name))
  }

  function save() {
    const unmapped = cols.find((c) => !c.json_field.trim())
    if (unmapped) { showToast('Map every column to a source field first'); return }
    const body = cols.map((c, i) => ({
      record_type: recordType, position: i + 1, json_field: c.json_field, mnt_column: c.mnt_column,
      rule_type: c.rule_type, rule_value: c.rule_value?.trim() || null, required: c.required,
    }))
    fetch(`/api/v1/mappings/${recordType}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) { showToast('Save failed'); return }
      showToast('Mapping saved')
      setCustomSources([])
      // Chỉ clear dirty KHI rules mới về (reload OK) → nếu GET lỗi thì giữ dirty, không revert âm thầm.
      fetch('/api/v1/mappings').then((res) => { if (!res.ok) throw new Error(); return res.json() })
        .then((data) => { setRules(data); setDirty(false) })
        .catch(() => showToast('Saved - reload failed, please refresh'))
      fetch('/api/v1/mappings/meta').then((res) => res.json()).then(setMeta).catch(() => {})
      fetch('/api/v1/mappings/preview').then((res) => res.json()).then(setPreview).catch(() => {})
    })
  }

  // ===== Đo & vẽ đường nối nguồn → cột =====
  const measure = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return
    const pr = panel.getBoundingClientRect()
    const out: Line[] = []
    for (const c of cols) {
      if (!c.json_field) continue
      // Đo tới TÂM của chấm neo (không phải tâm cả thẻ) để đường nối trùng đúng chấm xanh.
      const s = panel.querySelector(`[data-src-anchor="${CSS.escape(c.json_field)}"]`)
      const t = panel.querySelector(`[data-tgt-anchor="${CSS.escape(c.key)}"]`)
      if (!s || !t) continue
      const a = s.getBoundingClientRect(), b = t.getBoundingClientRect()
      out.push({
        key: c.key,
        x1: a.left + a.width / 2 - pr.left, y1: a.top + a.height / 2 - pr.top,
        x2: b.left + b.width / 2 - pr.left, y2: b.top + b.height / 2 - pr.top,
      })
    }
    setLines(out)
  }, [cols])

  useLayoutEffect(() => {
    measure()
    const ts = [40, 150, 350].map((d) => setTimeout(measure, d))
    window.addEventListener('resize', measure)
    return () => { ts.forEach(clearTimeout); window.removeEventListener('resize', measure) }
  }, [measure, search, cols, preview])

  const mappedCount = cols.filter((c) => c.json_field).length
  const afterHeaders = cols.map((c) => c.mnt_column)

  // Preview: chỉ lấy record đúng record_type đang chỉnh, "after" tính LIVE từ cột nháp (cols).
  const previewRows = (preview?.rows ?? []).filter((r) => r.record_type === recordType)
  const computedRows = previewRows.map((r) => ({ r, after: computeAfter(r.fields, cols) }))

  return (
    <div className="px-7 pt-[26px] pb-11 w-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[21px] font-semibold tracking-tight">Field mapping</h1>
          <p className="mt-[5px] text-[13.5px] text-muted">
            Drag a source field onto a target column. JSON order is free; the MNT file follows the target order top→bottom.
          </p>
        </div>
        <button onClick={save} disabled={!dirty}
          className={'inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-[9px] border ' +
            (dirty ? 'text-accent-text bg-accent border-accent cursor-pointer hover:brightness-95' : 'text-faint bg-surface2 border-border cursor-not-allowed')}>
          {dirty ? <SaveIcon size={14} /> : <CheckIcon size={14} />} {dirty ? 'Save mapping' : 'Saved'}
        </button>
      </div>

      {/* Toolbar: record_type tabs + search + progress */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-[3px] p-[3px] bg-surface2 border border-border rounded-[9px]">
          {recordTypes.map((t) => (
            <button key={t} onClick={() => { if (dirty && !confirm('Discard unsaved mapping changes?')) return; setDirty(false); setRecordType(t) }}
              className={'text-[12.5px] px-3 py-[5px] rounded-md border-none cursor-pointer font-mono ' +
                (recordType === t ? 'bg-surface text-fg font-semibold shadow-[var(--shadow)]' : 'bg-transparent text-muted')}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-faint grid place-items-center"><SearchIcon /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter source fields…"
            className="w-full py-2 pl-[34px] pr-[11px] border border-border rounded-[9px] bg-surface text-fg text-[13px] outline-none focus:border-accent" />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[12.5px] text-muted font-medium whitespace-nowrap">{mappedCount}/{cols.length} columns mapped</span>
          <div className="w-[110px] h-[6px] rounded-full bg-surface2 border border-border overflow-hidden">
            <div className="h-full bg-accent transition-[width] duration-300" style={{ width: (cols.length ? Math.round(mappedCount / cols.length * 100) : 0) + '%' }} />
          </div>
        </div>
      </div>

      {/* ===== Two panels + connector overlay ===== */}
      <div ref={panelRef} className="relative">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-[clamp(56px,8vw,110px)] items-start relative z-[2]">
          {/* SOURCE */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
              <div className="font-semibold text-[13px]">Source</div>
              <div className="text-[12px] text-muted">- HQ JSON</div>
              <span className="ml-auto font-mono text-[10px] font-medium text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">JSON</span>
            </div>
            <div className="flex flex-col gap-2">
              {shownSources.map((s) => {
                const used = usedSet.has(s)
                const sel = selectedSrc === s
                const custom = customSources.includes(s)
                return (
                  <div key={s} data-src={s} draggable
                    onDragStart={() => { setDragSrc(s); setSelectedSrc(null) }}
                    onDragEnd={() => { setDragSrc(null); setDragOver(null) }}
                    onClick={() => setSelectedSrc(sel ? null : s)}
                    className={'flex items-center gap-2.5 px-3 py-[9px] border rounded-[10px] relative select-none transition-colors cursor-grab ' +
                      (sel ? 'bg-surface border-accent shadow-[0_0_0_3px_var(--accent-weak)]'
                        : used ? 'bg-surface2 border-border hover:border-border2'
                        : 'bg-surface border-border hover:border-border2 hover:bg-surface2')}>
                    <svg width="12" height="16" viewBox="0 0 16 20" fill="currentColor" className="flex-none text-[color:var(--grip)]">
                      <circle cx="6" cy="5" r="1.4" /><circle cx="10" cy="5" r="1.4" /><circle cx="6" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="6" cy="15" r="1.4" /><circle cx="10" cy="15" r="1.4" />
                    </svg>
                    <span className="font-mono text-[12.5px] font-medium flex-1 truncate">{s}</span>
                    {used ? (
                      <span title="in use by a column" className="w-[18px] h-[18px] rounded-full bg-green-bg text-green grid place-items-center flex-none"><CheckIcon size={11} /></span>
                    ) : custom ? (
                      <button onClick={(e) => { e.stopPropagation(); removeSource(s) }} title="Remove custom field"
                        className="w-[18px] h-[18px] rounded-full grid place-items-center flex-none text-muted hover:text-accent hover:bg-accent-weak cursor-pointer"><XIcon size={11} /></button>
                    ) : null}
                    <span data-src-anchor={s} className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface box-border"
                      style={{ background: used ? 'var(--green)' : 'var(--border2)' }} />
                  </div>
                )
              })}
              {shownSources.length === 0 && q && (
                <div className="text-[12px] text-muted px-1 py-2">No source fields match "{search.trim()}".</div>
              )}
              {addingSrc ? (
                <div className="flex gap-2 items-center p-2.5 border border-dashed border-accent rounded-[10px] bg-accent-weak">
                  <input value={newSrc} onChange={(e) => setNewSrc(e.target.value)} placeholder="new_field_name" autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') addSource() }}
                    className="font-mono text-[12px] px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent flex-1 min-w-0" />
                  <button onClick={() => { setAddingSrc(false); setNewSrc('') }} className="text-[12px] text-muted px-2 cursor-pointer">Cancel</button>
                  <button onClick={addSource} className="text-[12px] font-semibold text-accent-text bg-accent px-3 py-1 rounded-md cursor-pointer">Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingSrc(true)}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 border border-dashed border-border2 rounded-[10px] text-muted text-[12.5px] font-medium cursor-pointer hover:border-accent hover:text-accent hover:bg-accent-weak transition-colors">
                  <PlusIcon /> Add source field
                </button>
              )}
            </div>
          </div>

          {/* TARGET */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
              <div className="font-semibold text-[13px]">Target</div>
              <div className="text-[12px] text-muted">- MNT columns (in order)</div>
              <span className="ml-auto font-mono text-[10px] font-medium text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">{recordType}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cols.map((c, i) => {
                const locked = c.locked
                const active = !locked && (dragOver === c.key || !!selectedSrc)
                // Cột chuẩn không đổi vị trí; cột động cũng không được chen QUA một cột chuẩn.
                const canUp = i > 0 && !locked && !cols[i - 1].locked
                const canDown = i < cols.length - 1 && !locked && !cols[i + 1].locked
                return (
                  <div key={c.key} data-tgt={c.key}
                    onDragOver={(e) => { if (!dragSrc || locked) return; e.preventDefault(); if (dragOver !== c.key) setDragOver(c.key) }}
                    onDragLeave={() => setDragOver((d) => (d === c.key ? null : d))}
                    onDrop={(e) => { e.preventDefault(); if (dragSrc) mapSource(c.key, dragSrc); setDragSrc(null); setDragOver(null) }}
                    onClick={() => { if (selectedSrc) mapSource(c.key, selectedSrc) }}
                    onDoubleClick={() => { if (!selectedSrc && c.json_field && !locked && Date.now() - lastMapRef.current > 350) clearCol(c.key) }}
                    title={c.json_field && !locked ? 'Double-click to unmap' : undefined}
                    className={'relative flex flex-col gap-2 px-3.5 py-3 border rounded-[10px] bg-surface transition-[border-color,box-shadow] ' +
                      (dragOver === c.key ? 'border-accent border-[1.5px] shadow-[0_0_0_3px_var(--accent-weak)] bg-accent-weak'
                        : active ? 'border-border2 border-dashed' : 'border-border') + (selectedSrc ? ' cursor-pointer' : '')}>
                    {/* left anchor */}
                    <span data-tgt-anchor={c.key} className="absolute -left-[6px] top-[22px] w-2.5 h-2.5 rounded-full border-2 border-surface box-border"
                      style={{ background: c.json_field ? 'var(--green)' : 'var(--border2)' }} />
                    {/* position + mnt_column + actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-faint w-5">#{i + 1}</span>
                          <span className="font-mono text-[12.5px] font-medium">{c.mnt_column}</span>
                        </div>
                        {c.json_field ? (
                          <div className="flex items-center gap-1.5 mt-1 ml-7 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-green bg-green-bg pl-2 pr-1 py-0.5 rounded">
                              {c.json_field}
                              {!locked && (
                                <button onClick={(e) => { e.stopPropagation(); clearCol(c.key) }} title="Unmap"
                                  className="grid place-items-center rounded-full text-green/60 hover:text-green cursor-pointer"><XIcon size={10} /></button>
                              )}
                            </span>
                            <span className={'text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ' + ruleTagCls(c.rule_type)}>{c.rule_type}</span>
                            {/* cột CHUẨN: dồn rule_value + built-in vào ĐÂY để thẻ còn 2 dòng */}
                            {locked && c.rule_value && (
                              <span title={c.rule_value} className="font-mono text-[9.5px] text-muted px-1.5 py-0.5 border border-border rounded bg-surface2 truncate max-w-[160px]">{c.rule_value}</span>
                            )}
                            {locked && (
                              <span title="Standard column (Oracle contract) - config fixed"
                                className="font-mono text-[9px] text-faint px-1.5 py-0.5 border border-border rounded bg-surface2 whitespace-nowrap select-none">built-in</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber mt-1 ml-7">drop a source field here</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-none">
                        <button onClick={(e) => { e.stopPropagation(); moveCol(i, -1) }} disabled={!canUp} title="Move up"
                          className={'w-5 h-5 grid place-items-center rounded ' + (canUp ? 'text-muted hover:text-fg cursor-pointer' : 'text-faint/40 cursor-not-allowed')}><ChevronUpIcon size={13} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveCol(i, 1) }} disabled={!canDown} title="Move down"
                          className={'w-5 h-5 grid place-items-center rounded ' + (canDown ? 'text-muted hover:text-fg cursor-pointer' : 'text-faint/40 cursor-not-allowed')}><ChevronDownIcon size={13} /></button>
                        {locked ? (
                          <span title="Standard column (Oracle contract) - locked: source & column fixed" className="w-5 h-5 grid place-items-center text-faint cursor-not-allowed">
                            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="2.5" y="5.3" width="7" height="4.7" rx="1" /><path d="M4 5.3V4a2 2 0 0 1 4 0v1.3" strokeLinecap="round" /></svg>
                          </span>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); removeCol(c.key) }} title="Remove column"
                            className="w-5 h-5 grid place-items-center text-muted hover:text-accent cursor-pointer"><XIcon size={13} /></button>
                        )}
                      </div>
                    </div>
                    {/* rule config — CHỈ cột ĐỘNG mới có hàng chỉnh; cột chuẩn đã dồn hết lên dòng 2 → thẻ 2 dòng */}
                    {!locked && (
                      <div className="flex items-center gap-2 ml-7 flex-wrap">
                        <select value={c.rule_type} onClick={(e) => e.stopPropagation()} onChange={(e) => setColField(c.key, { rule_type: e.target.value })}
                          className="font-mono text-[11px] px-2 py-1 border border-border rounded bg-surface text-fg outline-none focus:border-accent">
                          {ruleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {(c.rule_type === 'DEFAULT' || c.rule_type === 'VALUE_MAP') && (
                          <input value={c.rule_value ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => setColField(c.key, { rule_value: e.target.value })}
                            placeholder={c.rule_type === 'VALUE_MAP' ? '{"STORE":"S"}' : 'VND'}
                            className="font-mono text-[11px] px-2 py-1 border border-border rounded bg-surface text-fg outline-none focus:border-accent flex-1 min-w-[120px]" />
                        )}
                        <label onClick={(e) => e.stopPropagation()} title="required" className="flex items-center gap-1 text-[11px] text-muted cursor-pointer select-none">
                          <input type="checkbox" checked={c.required} onChange={(e) => setColField(c.key, { required: e.target.checked })} /> required
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
              {adding ? (
                <div className="flex flex-col gap-2.5 p-3 border border-dashed border-accent rounded-[10px] bg-accent-weak">
                  {/* Nhập JSON field — MNT (tên + kiểu) tự sinh bên dưới, vẫn sửa được */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-muted font-semibold">JSON field</label>
                    <input value={newCol.json_field} onChange={(e) => onJsonFieldChange(e.target.value)} placeholder="promo_code" autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') addColumn() }}
                      className="font-mono text-[12px] px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-muted font-semibold">MNT column <span className="text-faint normal-case font-normal">· auto</span></label>
                    <input value={newCol.mnt_column} onChange={(e) => setNewCol((n) => ({ ...n, mnt_column: e.target.value, nameEdited: e.target.value.trim() !== '' }))} placeholder="PROMO_CODE"
                      className="font-mono text-[12px] px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent" />
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <label className="flex items-center gap-1 text-[12px] text-muted cursor-pointer select-none">
                      <input type="checkbox" checked={newCol.required} onChange={(e) => setNewCol((n) => ({ ...n, required: e.target.checked }))} /> required
                    </label>
                    <span className="text-[10.5px] text-faint">rule = DIRECT (edit inline later)</span>
                    <div className="flex-1" />
                    <button onClick={() => { setAdding(false); setNewCol({ json_field: '', mnt_column: '', required: false, nameEdited: false }) }}
                      className="text-[12px] text-muted px-2.5 py-1 cursor-pointer">Cancel</button>
                    <button onClick={addColumn} className="text-[12px] font-semibold text-accent-text bg-accent px-3 py-1 rounded-md cursor-pointer">Add</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(true)}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 border border-dashed border-border2 rounded-[10px] text-muted text-[12.5px] font-medium cursor-pointer hover:border-accent hover:text-accent hover:bg-accent-weak transition-colors">
                  <PlusIcon /> Add target column
                </button>
              )}
            </div>
          </div>
        </div>

        {/* connector lines — chỉ có nghĩa khi 2 panel nằm ngang (md+); màn hẹp stack dọc thì ẩn.
            Đường của cột KHÔNG khoá: double-click để gỡ nối (vùng bấm dày trong suốt cho dễ trúng). */}
        <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-[1] overflow-visible">
          {lines.map((l) => {
            const dx = Math.max(36, Math.abs(l.x2 - l.x1) * 0.45)
            const d = `M ${l.x1} ${l.y1} C ${l.x1 + dx} ${l.y1}, ${l.x2 - dx} ${l.y2}, ${l.x2} ${l.y2}`
            const unlockable = cols.some((c) => c.key === l.key && !c.locked)
            return (
              <g key={l.key}>
                {unlockable && (
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16}
                    className="pointer-events-auto cursor-pointer" onDoubleClick={() => { if (Date.now() - lastMapRef.current > 350) clearCol(l.key) }}>
                    <title>Double-click to unmap</title>
                  </path>
                )}
                <path d={d} fill="none" stroke="var(--green)" strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />
              </g>
            )
          })}
        </svg>
      </div>

      {/* ===== Preview Before/After — "After" tính LIVE theo cột nháp (không cần Save) ===== */}
      <div className="border-t border-border pt-6 flex flex-col gap-4">
        {previewRows.length ? (
          <>
            <PreviewTable title="Before - source feeding each column" green={false}
              headers={['change_type', ...cols.map((c) => c.json_field || '(none)')]}
              rows={previewRows.map((r) => [
                r.before?.change_type ?? r.fields?.change_type ?? '',
                ...cols.map((c) => r.before?.[c.json_field] ?? r.fields?.[c.json_field] ?? ''),
              ])} />
            <div className="flex items-center justify-center gap-2 text-accent text-[12px] font-semibold">
              <span className="h-px w-10 bg-border2" />
              <span className="inline-flex items-center gap-1.5 bg-accent-weak px-3 py-1 rounded-full">Apply mapping <ArrowRightIcon size={12} /></span>
              <span className="h-px w-10 bg-border2" />
            </div>
            <PreviewTable title="After - MNT columns (this becomes the file)" green
              headers={['RECORD_TYPE', ...afterHeaders]}
              rows={computedRows.map(({ r, after }) => [r.record_type, ...(after ?? Array(afterHeaders.length).fill('-'))])}
              notes={computedRows.map(({ after }) => (after === null ? 'unmappable - unknown prefix or missing field' : null))} />
          </>
        ) : (
          <div className="text-[12.5px] text-muted">No sample {recordType} records in the latest batch.</div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg px-[18px] py-[11px] rounded-[10px] text-[13px] font-medium flex items-center gap-2 shadow-2xl"
             style={{ animation: 'toastin .2s ease' }}>
          <CheckIcon size={15} /> {toast}
        </div>
      )}
    </div>
  )
}

function PreviewTable({ title, headers, rows, green, notes }: {
  title: string; headers: string[]; rows: string[][]; green: boolean; notes?: (string | null)[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={'flex items-center gap-2 text-[11px] uppercase tracking-[0.05em] font-semibold ' + (green ? 'text-green' : 'text-muted')}>
        <span className={'w-[7px] h-[7px] rounded-full ' + (green ? 'bg-green' : 'bg-muted')} />{title}
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="border-collapse w-full">
            <thead>
              <tr className="bg-surface2">
                {headers.map((h, i) => (
                  <th key={i} className={'px-3 py-2 text-left font-mono text-[10.5px] font-semibold whitespace-nowrap border-b border-border ' + (green && i === 0 ? 'text-accent' : 'text-muted')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((v, ci) => (
                    <td key={ci} className={'px-3 py-2 font-mono text-[11.5px] whitespace-nowrap border-b border-border ' +
                      (green && ci === 0 ? 'bg-accent-weak text-accent font-medium ' : '') + (v === '-' || v === '' ? 'text-faint' : '')}>
                      {v === '' ? '-' : v}{green && ci === row.length - 1 && notes?.[ri] ? <span className="text-amber"> · {notes[ri]}</span> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
