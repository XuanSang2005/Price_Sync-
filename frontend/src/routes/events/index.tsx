import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { EventSummary } from '../../types'
import { StatusPill } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { SearchIcon } from '../../components/icons'

export const Route = createFileRoute('/events/')({ component: EventsPage })

// Result text derived from real status (no fabricated numbers).
function resultText(status: string): string {
  switch (status) {
    case 'WRITTEN': return 'Written to Xcenter'
    case 'PARTIAL': return 'Written, some set aside'
    case 'FAILED': return 'Failed — see detail'
    case 'PENDING_WRITE': return 'Retry pending'
    default: return 'Processing'
  }
}

function EventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventSummary[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    function load() {
      fetch('/api/v1/events').then((r) => r.json()).then(setEvents).catch(() => {})
    }
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const present = [...new Set(events.map((e) => e.status))]
  const tabs = ['all', ...present]

  const q = search.trim().toLowerCase()
  const rows = [...events]
    .sort((a, b) => b.id - a.id)
    .filter((e) => (statusFilter === 'all' || e.status === statusFilter))
    .filter((e) => !q || e.batch_id.toLowerCase().includes(q))

  const tabClass = (active: boolean) =>
    'text-[12.5px] px-3 py-[5px] rounded-md border-none cursor-pointer whitespace-nowrap ' +
    (active ? 'bg-surface text-fg font-semibold shadow-[var(--shadow)]' : 'bg-transparent text-muted font-medium')

  return (
    <div className="px-7 pt-[26px] pb-11 max-w-[1220px] mx-auto w-full flex flex-col gap-[18px]">
      <div>
        <h1 className="m-0 text-[21px] font-semibold tracking-tight">Events</h1>
        <p className="mt-[5px] text-[13.5px] text-muted">Every price event, received to written.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-[3px] p-[3px] bg-surface2 border border-border rounded-[9px] flex-wrap">
          {tabs.map((t) => (
            <button key={t} onClick={() => setStatusFilter(t)} className={tabClass(statusFilter === t)}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-[300px] ml-auto">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-faint grid place-items-center">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch id…"
            className="w-full py-2 pl-[34px] pr-[11px] border border-border rounded-[9px] bg-surface text-fg text-[13px] outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid gap-3 px-[18px] py-[11px] border-b border-border bg-surface2 text-[10.5px] uppercase tracking-[0.05em] text-faint font-semibold"
                 style={{ gridTemplateColumns: '110px 1.2fr 70px 130px 1.4fr' }}>
              <div>Time</div><div>Batch ID</div><div>Ver</div><div>Status</div><div>Result</div>
            </div>
            {rows.map((e) => (
              <div
                key={e.id}
                onClick={() => navigate({ to: '/events/$id', params: { id: String(e.id) } })}
                className="grid gap-3 px-[18px] py-[13px] border-b border-border items-center cursor-pointer hover:bg-surface2"
                style={{ gridTemplateColumns: '110px 1.2fr 70px 130px 1.4fr' }}
              >
                <div className="font-mono text-[11.5px] text-muted">{formatTimeDate(e.generated_at)}</div>
                <div className="font-mono text-[12px] font-medium truncate">{e.batch_id}</div>
                <div className="font-mono text-[12px] text-muted">v{e.version}</div>
                <div><StatusPill status={e.status} /></div>
                <div className="text-[12px] text-muted truncate">{resultText(e.status)}</div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="px-7 py-7 text-center text-muted text-[13px]">No events match.</div>
            )}
          </div>
        </div>
      </div>
      <div className="text-[11.5px] text-faint">
        Showing {rows.length} of {events.length} · status covers this system only (received → Xcenter).
      </div>
    </div>
  )
}
