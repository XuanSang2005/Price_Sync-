import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import type { EventDetail, EventLog, EventFile, EventRecord } from '../../types'
import { StatusPill, RecordPill } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { RefreshIcon, CheckIcon, XIcon, AlertIcon } from '../../components/icons'

export const Route = createFileRoute('/events/$id')({ component: EventDetailPage })

type StepState = 'done' | 'current' | 'error' | 'todo'

// Build the 4 lifecycle steps from real logs + current status.
function buildSteps(status: string, logStatuses: Set<string>): { label: string; state: StepState }[] {
  const beyondReceived = ['PROCESSING', 'WRITING', 'PENDING_WRITE', 'WRITTEN', 'PARTIAL', 'FAILED']
  const written = status === 'WRITTEN' || status === 'PARTIAL'
  const proc: StepState =
    logStatuses.has('PROCESSING') || beyondReceived.includes(status) ? 'done'
    : status === 'RECEIVED' ? 'current' : 'todo'
  const writing: StepState =
    written ? 'done'
    : status === 'PENDING_WRITE' ? 'current'
    : status === 'FAILED' ? 'error'
    : status === 'PROCESSING' ? 'current' : 'todo'
  const finalLabel = status === 'FAILED' ? 'Failed' : status === 'PARTIAL' ? 'Partial'
    : status === 'PENDING_WRITE' ? 'Pending' : 'Written'
  const finalState: StepState =
    status === 'WRITTEN' ? 'done' : status === 'PARTIAL' ? 'done'
    : status === 'FAILED' ? 'error' : status === 'PENDING_WRITE' ? 'current' : 'todo'
  return [
    { label: 'Received', state: 'done' },
    { label: 'Processing', state: proc },
    { label: 'Writing', state: writing },
    { label: finalLabel, state: finalState },
  ]
}

function stepColor(s: StepState) {
  if (s === 'error') return { text: 'text-accent', bg: 'bg-accent-weak', ring: 'border-transparent' }
  if (s === 'current') return { text: 'text-muted', bg: 'bg-surface2', ring: 'border-border' }
  if (s === 'done') return { text: 'text-green', bg: 'bg-green-bg', ring: 'border-transparent' }
  return { text: 'text-faint', bg: 'bg-surface2', ring: 'border-border' }
}

// Rebuild the original payload JSON from real records.
function buildPayload(d: EventDetail): string {
  const obj = {
    batch_id: d.batch_id,
    version: d.version,
    generated_at: d.generated_at,
    records: d.records.map((r) => ({
      change_id: r.change_id,
      version: r.version,
      item_id: r.item_id,
      store_id_or_zone: r.store_id_or_zone,
      price: r.price,
      currency: r.currency,
      effective_start: r.effective_start,
      effective_end: r.effective_end,
      change_type: r.change_type,
      ...(r.extras ?? {}),
    })),
  }
  return JSON.stringify(obj, null, 2)
}

function EventDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [logs, setLogs] = useState<EventLog[]>([])
  const [file, setFile] = useState<EventFile | null>(null)
  const [payloadOpen, setPayloadOpen] = useState(true)
  const [toast, setToast] = useState('')

  const load = useCallback(() => {
    fetch(`/api/v1/events/${id}`).then((r) => r.json()).then(setDetail).catch(() => {})
    fetch(`/api/v1/events/${id}/logs`).then((r) => r.json()).then(setLogs).catch(() => {})
    fetch(`/api/v1/events/${id}/file`).then((r) => r.json()).then(setFile).catch(() => {})
  }, [id])

  useEffect(() => { load() }, [load])

  function showToast(m: string) {
    setToast(m)
    setTimeout(() => setToast(''), 2400)
  }

  function retry() {
    fetch(`/api/v1/events/${id}/retry`, { method: 'POST' }).then(() => {
      showToast('Retry requested')
      setTimeout(load, 400)
    })
  }

  function downloadFile() {
    if (!file?.content || !file.file_name) return
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.file_name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!detail) {
    return <div className="px-7 py-8 text-muted text-sm">Loading…</div>
  }

  const steps = buildSteps(detail.status, new Set(logs.map((l) => l.status)))
  const setAside = detail.records.filter((r: EventRecord) => r.validation_status === 'SET_ASIDE')
  const canRetry = detail.status === 'FAILED' || detail.status === 'PENDING_WRITE'

  return (
    <div className="px-7 pt-[26px] pb-11 max-w-[1000px] mx-auto w-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <button
            onClick={() => navigate({ to: '/events' })}
            className="text-[12px] text-muted hover:text-fg mb-2 cursor-pointer bg-transparent border-none p-0"
          >
            ← Events
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[16px] font-semibold">{detail.batch_id}</span>
            <span className="font-mono text-[12px] text-muted">v{detail.version}</span>
            <StatusPill status={detail.status} />
          </div>
          <div className="text-[12px] text-muted mt-1.5">
            Received {formatTimeDate(detail.generated_at)} · {detail.records.length} records
            {detail.retry_count > 0 && <> · retried {detail.retry_count}×</>}
          </div>
        </div>
        <div className="flex gap-2 flex-none flex-wrap">
          {canRetry && (
            <button onClick={retry}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent-text bg-accent border border-accent px-3.5 py-2 rounded-[9px] cursor-pointer hover:brightness-95">
              <RefreshIcon /> Retry
            </button>
          )}
          <button onClick={load}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg bg-surface border border-border px-3 py-2 rounded-[9px] cursor-pointer hover:bg-surface2">
            <RefreshIcon /> Reload
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-surface border border-border rounded-xl p-[18px]">
        <div className="flex items-center">
          {steps.map((s, i) => {
            const c = stepColor(s.state)
            return (
              <div key={i} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1.5 flex-none">
                  <span className={'w-6 h-6 rounded-full grid place-items-center border ' + c.bg + ' ' + c.text + ' ' + c.ring}>
                    {s.state === 'done' ? <CheckIcon size={12} /> : s.state === 'error' ? <XIcon size={11} /> : s.state === 'current' ? '•' : ''}
                  </span>
                  <span className={'text-[10px] font-medium whitespace-nowrap ' + c.text}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={'flex-1 h-0.5 mx-1.5 mb-[18px] rounded ' + (s.state === 'done' ? 'bg-green' : 'bg-border')} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Lifecycle log */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-[18px] py-3.5 border-b border-border font-semibold text-[13.5px]">Lifecycle log</div>
        {logs.length === 0 ? (
          <div className="px-[18px] py-5 text-[12.5px] text-muted">No log yet.</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="flex items-center gap-3 px-[18px] py-2.5 border-b border-border text-[12.5px]">
              <span className="font-mono text-[11px] text-faint w-[92px] flex-none">{formatTimeDate(l.created_at)}</span>
              <StatusPill status={l.status} />
              <span className="text-muted flex-1 min-w-0 truncate">{l.note || '—'}</span>
            </div>
          ))
        )}
      </div>

      {/* Payload (rebuilt from records) */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <button onClick={() => setPayloadOpen((o) => !o)}
          className="w-full flex items-center justify-between px-[18px] py-3.5 border-b border-border bg-transparent cursor-pointer">
          <span className="font-semibold text-[13.5px]">Payload · JSON</span>
          <span className="text-[11px] text-accent font-semibold">{payloadOpen ? 'Hide' : 'Show'}</span>
        </button>
        {payloadOpen && (
          <pre className="m-0 p-3.5 font-mono text-[11.5px] leading-relaxed text-fg overflow-x-auto whitespace-pre">
            {buildPayload(detail)}
          </pre>
        )}
      </div>

      {/* Generated MNT file */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-[18px] py-3.5 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-[13.5px]">Generated MNT file</span>
          {file?.exists && (
            <button onClick={downloadFile}
              className="text-[11.5px] font-medium text-fg bg-surface border border-border px-2.5 py-1 rounded-md cursor-pointer hover:bg-surface2">
              Download
            </button>
          )}
        </div>
        {file?.exists ? (
          <>
            <div className="px-[18px] pt-3 font-mono text-[12px] font-medium">{file.file_name}</div>
            <pre className="m-3.5 mt-2 p-3.5 bg-surface2 border border-border rounded-lg font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre">
              {file.content}
            </pre>
          </>
        ) : (
          <div className="px-[18px] py-4 text-[12.5px] text-amber bg-amber-bg m-3.5 rounded-lg border border-amber">
            {file?.note ?? 'No file.'}
          </div>
        )}
      </div>

      {/* Records / validation */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-[18px] py-3.5 border-b border-border font-semibold text-[13.5px]">
          Records ({detail.records.length})
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid gap-3 px-[18px] py-2 border-b border-border bg-surface2 text-[10.5px] uppercase tracking-[0.05em] text-faint font-semibold"
                 style={{ gridTemplateColumns: '1.2fr 1fr 1fr 110px 1.4fr' }}>
              <div>Change ID</div><div>Item</div><div>Store/Zone</div><div>Status</div><div>Reason</div>
            </div>
            {detail.records.map((r, i) => (
              <div key={i} className="grid gap-3 px-[18px] py-2.5 border-b border-border items-center text-[12px] font-mono"
                   style={{ gridTemplateColumns: '1.2fr 1fr 1fr 110px 1.4fr' }}>
                <div className="truncate">{r.change_id}</div>
                <div className="truncate">{r.item_id}</div>
                <div className="truncate">{r.store_id_or_zone}</div>
                <div><RecordPill status={r.validation_status} /></div>
                <div className="truncate text-amber">{r.set_aside_reason || ''}</div>
              </div>
            ))}
          </div>
        </div>
        {setAside.length > 0 && (
          <div className="px-[18px] py-2.5 text-[12px] text-amber flex items-center gap-2 bg-amber-bg border-t border-border">
            <AlertIcon /> {setAside.length} set aside — excluded from file.
          </div>
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
