import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import type { MappingRule } from '../../types'
import { PlusIcon, XIcon, CheckIcon } from '../../components/icons'

export const Route = createFileRoute('/mapping/')({ component: MappingPage })

// Standard columns (Oracle contract, fixed order) → locked, can't delete in UI.
const STANDARD_FIELDS = new Set([
  'item_id', 'store_id_or_zone', 'price', 'currency', 'effective_start', 'effective_end',
])

const RULE_TYPES = ['DIRECT', 'DEFAULT', 'VALUE_MAP', 'SPLIT']
const DATA_TYPES = ['', 'STRING', 'NUMBER', 'DATE']

function ruleTag(type: string) {
  const map: Record<string, string> = {
    DIRECT: 'text-muted bg-surface2',
    DEFAULT: 'text-amber bg-amber-bg',
    VALUE_MAP: 'text-accent bg-accent-weak',
    SPLIT: 'text-green bg-green-bg',
  }
  return map[type] ?? 'text-muted bg-surface2'
}

type Draft = {
  record_type: string; position: string; json_field: string; mnt_column: string
  rule_type: string; rule_value: string; data_type: string; required: boolean
}
const EMPTY: Draft = {
  record_type: 'FDETL', position: '', json_field: '', mnt_column: '',
  rule_type: 'DIRECT', rule_value: '', data_type: '', required: false,
}

function MappingPage() {
  const [rules, setRules] = useState<MappingRule[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [toast, setToast] = useState('')

  const load = useCallback(() => {
    fetch('/api/v1/mappings').then((r) => r.json()).then(setRules).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2600) }

  function removeRule(id: number) {
    fetch(`/api/v1/mappings/${id}`, { method: 'DELETE' }).then(() => { showToast('Rule deleted'); load() })
  }

  function addRule() {
    if (!draft.json_field.trim() || !draft.mnt_column.trim() || !draft.position.trim()) {
      showToast('Fill position, json_field, mnt_column')
      return
    }
    fetch('/api/v1/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_type: draft.record_type,
        position: Number(draft.position),
        json_field: draft.json_field.trim(),
        mnt_column: draft.mnt_column.trim(),
        rule_type: draft.rule_type,
        rule_value: draft.rule_value.trim() || null,
        data_type: draft.data_type || null,
        required: draft.required,
      }),
    }).then((r) => {
      if (!r.ok) { showToast('Add failed (duplicate position?)'); return }
      showToast('Rule added')
      setAdding(false)
      setDraft(EMPTY)
      load()
    })
  }

  const groups = [...new Set(rules.map((r) => r.record_type))].sort()
  const byGroup = (g: string) => rules.filter((r) => r.record_type === g).sort((a, b) => a.position - b.position)

  const showRuleValue = draft.rule_type === 'DEFAULT' || draft.rule_type === 'VALUE_MAP'
  const inputCls = 'w-full py-[7px] px-2.5 border border-border rounded-lg bg-surface text-fg text-[12.5px] outline-none focus:border-accent font-mono'

  return (
    <div className="px-7 pt-[26px] pb-11 max-w-[1180px] mx-auto w-full flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[21px] font-semibold tracking-tight">Field mapping</h1>
          <p className="mt-[5px] text-[13.5px] text-muted">
            Each rule = one MNT column. Declare a field here → mapped &amp; emitted, no code change.
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-text bg-accent border border-accent px-4 py-2 rounded-[9px] cursor-pointer hover:brightness-95">
            <PlusIcon /> Add rule
          </button>
        )}
      </div>

      {/* Add rule form */}
      {adding && (
        <div className="bg-surface border border-dashed border-accent rounded-xl p-[18px] flex flex-col gap-3">
          <div className="font-semibold text-[13.5px]">New rule</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">record_type</label>
              <select value={draft.record_type} onChange={(e) => setDraft({ ...draft, record_type: e.target.value })} className={inputCls}>
                {['FDETL', 'FDELE', 'FHEAD', 'FTAIL'].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">position</label>
              <input value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} placeholder="8" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">json_field</label>
              <input value={draft.json_field} onChange={(e) => setDraft({ ...draft, json_field: e.target.value })} placeholder="promo_code" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">mnt_column</label>
              <input value={draft.mnt_column} onChange={(e) => setDraft({ ...draft, mnt_column: e.target.value })} placeholder="PROMO_CODE" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">rule_type</label>
              <select value={draft.rule_type} onChange={(e) => setDraft({ ...draft, rule_type: e.target.value })} className={inputCls}>
                {RULE_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            {showRuleValue && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">rule_value</label>
                <input value={draft.rule_value} onChange={(e) => setDraft({ ...draft, rule_value: e.target.value })}
                  placeholder={draft.rule_type === 'VALUE_MAP' ? '{"STORE":"S"}' : 'VND'} className={inputCls} />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">data_type (shape check)</label>
              <select value={draft.data_type} onChange={(e) => setDraft({ ...draft, data_type: e.target.value })} className={inputCls}>
                {DATA_TYPES.map((x) => <option key={x} value={x}>{x || '(no check)'}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] mt-5">
              <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
              required
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setDraft(EMPTY) }} className="text-[12px] font-medium text-fg bg-surface border border-border px-3 py-1.5 rounded-md cursor-pointer">Cancel</button>
            <button onClick={addRule} className="text-[12px] font-semibold text-accent-text bg-accent border border-accent px-3 py-1.5 rounded-md cursor-pointer">Add</button>
          </div>
        </div>
      )}

      {/* Rules grouped by record_type */}
      {groups.length === 0 && <div className="text-muted text-[13px]">No rules yet.</div>}
      {groups.map((g) => (
        <div key={g} className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-[18px] py-3 border-b border-border font-mono text-[12px] font-semibold flex items-center gap-2">
            {g}
            <span className="text-[11px] text-muted font-sans font-normal">{byGroup(g).length} cols</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid gap-3 px-[18px] py-2 border-b border-border bg-surface2 text-[10.5px] uppercase tracking-[0.05em] text-faint font-semibold"
                   style={{ gridTemplateColumns: '60px 1.2fr 1.2fr 110px 1.4fr 130px 40px' }}>
                <div>Pos</div><div>json_field</div><div>mnt_column</div><div>rule</div><div>rule_value</div><div>data_type</div><div></div>
              </div>
              {byGroup(g).map((r) => (
                <div key={r.id} className="grid gap-3 px-[18px] py-2.5 border-b border-border items-center text-[12px] font-mono"
                     style={{ gridTemplateColumns: '60px 1.2fr 1.2fr 110px 1.4fr 130px 40px' }}>
                  <div className="text-muted">{r.position}</div>
                  <div className="truncate">{r.json_field}</div>
                  <div className="truncate">{r.mnt_column}</div>
                  <div><span className={'text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ' + ruleTag(r.rule_type)}>{r.rule_type}</span></div>
                  <div className="truncate text-muted">{r.rule_value || '—'}</div>
                  <div className="text-[11px] text-muted">
                    {r.data_type || '—'}{r.required && <span className="text-amber"> ·req</span>}
                  </div>
                  <div>
                    {STANDARD_FIELDS.has(r.json_field) ? (
                      <span title="Standard column (Oracle contract) — locked" className="text-faint grid place-items-center cursor-not-allowed">
                        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.1">
                          <rect x="2.5" y="5.3" width="7" height="4.7" rx="1" />
                          <path d="M4 5.3V4a2 2 0 0 1 4 0v1.3" strokeLinecap="round" />
                        </svg>
                      </span>
                    ) : (
                      <button onClick={() => removeRule(r.id)} title="Delete rule"
                        className="w-5 h-5 grid place-items-center text-muted hover:text-accent cursor-pointer bg-transparent border-none">
                        <XIcon size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg px-[18px] py-[11px] rounded-[10px] text-[13px] font-medium flex items-center gap-2 shadow-2xl"
             style={{ animation: 'toastin .2s ease' }}>
          <CheckIcon size={15} /> {toast}
        </div>
      )}
    </div>
  )
}
