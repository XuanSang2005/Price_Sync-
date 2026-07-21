import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import type { EventSummary, Health } from '../../types'
import { StatusPill, StatusDot } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { ServerIcon, FolderIcon } from '../../components/icons'

export const Route = createFileRoute('/dashboard/')({ component: DashboardPage })

const ATTENTION = ['FAILED', 'PENDING_WRITE', 'PARTIAL']

// Bucket events by hour ("YYYY-MM-DD HH"), keep the last 14 buckets.
function bucketByHour(events: EventSummary[]) {
  const map = new Map<string, { label: string; count: number; ts: number }>()
  for (const e of events) {
    const d = new Date(e.generated_at)
    const key = d.toISOString().slice(0, 13)
    const label = String(d.getHours()).padStart(2, '0')
    const cur = map.get(key)
    if (cur) cur.count++
    else map.set(key, { label, count: 1, ts: d.getTime() })
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts).slice(-14)
}

function DashboardPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventSummary[]>([])
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [health, setHealth] = useState<Health | null>(null)

  const load = useCallback(() => {
    fetch('/api/v1/events').then((r) => r.json()).then(setEvents).catch(() => {})
    fetch('/api/v1/events/metrics').then((r) => r.json()).then(setMetrics).catch(() => {})
    fetch('/api/v1/health').then((r) => r.json()).then(setHealth).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  function retry(id: number) {
    fetch(`/api/v1/events/${id}/retry`, { method: 'POST' }).then(() => load())
  }

  const total = Object.values(metrics).reduce((a, b) => a + b, 0)
  const written = metrics.WRITTEN ?? 0
  const partial = metrics.PARTIAL ?? 0
  const failed = metrics.FAILED ?? 0
  const inflight =
    (metrics.RECEIVED ?? 0) + (metrics.PROCESSING ?? 0) + (metrics.WRITING ?? 0) + (metrics.PENDING_WRITE ?? 0)

  const cards = [
    { label: 'Total events', value: total, sub: 'all time', accent: false },
    { label: 'Written to Xcenter', value: written, sub: partial > 0 ? `+${partial} partial` : 'all', accent: false },
    { label: 'Errors', value: failed, sub: 'failed batches', accent: failed > 0 },
    { label: 'In progress', value: inflight, sub: 'received → pending write', accent: false },
  ]

  const bars = bucketByHour(events)
  const maxBar = Math.max(1, ...bars.map((b) => b.count))

  const attention = [...events].filter((e) => ATTENTION.includes(e.status)).sort((a, b) => b.id - a.id)
  const recent = [...events].sort((a, b) => b.id - a.id).slice(0, 6)

  const healthRows = [
    { name: 'API', dir: 'HTTP · console', ok: !!health?.api, icon: <ServerIcon size={17} /> },
    { name: 'Database', dir: 'PostgreSQL', ok: !!health?.db, icon: <FolderIcon size={17} /> },
  ]

  return (
    <div className="px-7 pt-[26px] pb-11 max-w-[1220px] mx-auto w-full flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[21px] font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-[5px] text-[13.5px] text-muted">Pipeline status up to the Xcenter inbound folder.</p>
        </div>
        <span className="text-[12px] text-muted font-mono">
          {health?.checked_at ? 'Updated ' + formatTimeDate(health.checked_at) : 'UAT'}
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
        {cards.map((m) => (
          <div key={m.label} className="bg-surface border border-border rounded-xl px-[18px] py-4 flex flex-col gap-1.5">
            <div className="text-[12px] text-muted font-medium">{m.label}</div>
            <div className={'text-[28px] font-bold tracking-tight font-mono ' + (m.accent ? 'text-accent' : 'text-fg')}>
              {m.value}
            </div>
            <div className={'text-[11px] ' + (m.accent ? 'text-accent' : 'text-faint')}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + health */}
      <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="font-semibold text-[13.5px]">Events per hour</div>
            <div className="text-[11.5px] text-muted">by hour · last 14</div>
          </div>
          {bars.length === 0 ? (
            <div className="h-[150px] grid place-items-center text-[13px] text-muted">No events yet.</div>
          ) : (
            <div className="flex items-end gap-1.5 h-[150px] pt-2">
              {bars.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    title={b.label + ':00 — ' + b.count + ' events'}
                    className={
                      'w-full rounded-t ' +
                      (b.count === maxBar ? 'bg-accent' : 'bg-accent-weak border border-accent-weak')
                    }
                    style={{ height: Math.max(3, Math.round((b.count / maxBar) * 118)) + 'px' }}
                  />
                  <div className="text-[9.5px] text-faint font-mono">{b.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3">
          <div className="font-semibold text-[13.5px]">Connection health</div>
          {healthRows.map((h) => (
            <div key={h.name} className="flex items-center gap-[11px] px-3 py-[11px] border border-border rounded-[10px] bg-surface2">
              <span className="w-[30px] h-[30px] rounded-lg bg-surface border border-border grid place-items-center text-fg flex-none">
                {h.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[12.5px]">{h.name}</div>
                <div className="text-[11px] text-muted">{h.dir}</div>
              </div>
              <span
                className={
                  'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-[3px] rounded-full whitespace-nowrap ' +
                  (h.ok ? 'text-green bg-green-bg' : 'text-accent bg-accent-weak')
                }
              >
                <span className={'w-1.5 h-1.5 rounded-full ' + (h.ok ? 'bg-green' : 'bg-accent')} />
                {h.ok ? 'OK' : 'Down'}
              </span>
            </div>
          ))}
          <div className="text-[11px] text-faint mt-auto leading-relaxed">
            Store delivery is handled by Xstore — out of scope.
          </div>
        </div>
      </div>

      {/* Attention + recent */}
      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-border">
            <div className="font-semibold text-[13.5px] flex items-center gap-2">
              <span className="w-[7px] h-[7px] rounded-full bg-accent" />
              Attention
            </div>
            <span className="text-[11px] text-muted">{attention.length} open</span>
          </div>
          {attention.length === 0 ? (
            <div className="px-[18px] py-6 text-[13px] text-muted text-center">All clear.</div>
          ) : (
            attention.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-[18px] py-3 border-b border-border text-[12.5px]">
                <span className="font-mono text-[11px] text-faint w-[92px] flex-none">{formatTimeDate(e.generated_at)}</span>
                <StatusDot status={e.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.batch_id}</div>
                  <div className="text-[11px] text-muted font-mono">{e.status}</div>
                </div>
                <div className="flex gap-1.5 flex-none">
                  <button
                    onClick={() => navigate({ to: '/events/$id', params: { id: String(e.id) } })}
                    className="text-[11.5px] font-medium text-fg bg-surface border border-border px-2.5 py-[5px] rounded-md cursor-pointer hover:bg-surface2"
                  >
                    View
                  </button>
                  {e.status === 'FAILED' && (
                    <button
                      onClick={() => retry(e.id)}
                      className="text-[11.5px] font-semibold text-accent-text bg-accent border border-accent px-2.5 py-[5px] rounded-md cursor-pointer hover:brightness-95"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-border">
            <div className="font-semibold text-[13.5px]">Recent activity</div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ animation: 'pip 2.4s ease-in-out infinite' }} />
              Live
            </span>
          </div>
          {recent.length === 0 ? (
            <div className="px-[18px] py-6 text-[13px] text-muted text-center">No data yet.</div>
          ) : (
            recent.map((e) => (
              <div
                key={e.id}
                onClick={() => navigate({ to: '/events/$id', params: { id: String(e.id) } })}
                className="flex items-center gap-3 px-[18px] py-[11px] border-b border-border text-[12.5px] cursor-pointer hover:bg-surface2"
              >
                <span className="font-mono text-[11px] text-faint w-[92px] flex-none">{formatTimeDate(e.generated_at)}</span>
                <div className="flex-1 min-w-0 font-mono text-[11.5px] truncate">
                  {e.batch_id} <span className="text-muted">· v{e.version}</span>
                </div>
                <StatusPill status={e.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
