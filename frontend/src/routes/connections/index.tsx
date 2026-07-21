import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import type { ConfigItem, Health } from '../../types'
import { ServerIcon, FolderIcon, SyncIcon, ArrowRightIcon, CheckIcon } from '../../components/icons'

export const Route = createFileRoute('/connections/')({ component: ConnectionsPage })

// One config field bound to a config_key: reads GET /config, writes PUT /config/{key}.
// Missing key in DB → locked with a "no DB" tag (honest wiring).
function ConfigField({
  label, ck, value, present, mono, onSaved, showToast,
}: {
  label: string; ck: string; value: string; present: boolean; mono?: boolean
  onSaved: () => void; showToast: (m: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  function save() {
    if (ck === 'filename_pattern' && (!draft.endsWith('.mnt') || !draft.includes('<ts>'))) {
      showToast('Filename must end .mnt and contain <ts>')
      return
    }
    fetch(`/api/v1/config/${ck}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_value: draft }),
    }).then(() => {
      setEditing(false)
      showToast('Saved ' + ck)
      onSaved()
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-muted font-medium">{label}</label>
        {!present ? (
          <span className="text-[9.5px] font-semibold uppercase tracking-wide text-faint border border-border px-1.5 py-px rounded">no DB</span>
        ) : editing ? (
          <span className="flex gap-2">
            <button onClick={() => { setEditing(false); setDraft(value) }} className="text-[10.5px] text-muted cursor-pointer bg-transparent border-none">Cancel</button>
            <button onClick={save} className="text-[10.5px] font-semibold text-accent cursor-pointer bg-transparent border-none">Save</button>
          </span>
        ) : (
          <button onClick={() => setEditing(true)} className="text-[10.5px] font-semibold text-accent cursor-pointer bg-transparent border-none">Edit</button>
        )}
      </div>
      {editing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={'w-full py-[7px] px-2.5 border border-border rounded-lg bg-surface text-fg text-[12.5px] outline-none focus:border-accent ' + (mono ? 'font-mono' : '')}
        />
      ) : (
        <div className={'text-[12.5px] px-2.5 py-[7px] rounded-lg bg-surface2 border border-border break-all ' + (mono ? 'font-mono text-[11.5px]' : '') + (present ? '' : ' text-faint')}>
          {present ? (value || '—') : 'mock — seed key in DB to enable'}
        </div>
      )}
    </div>
  )
}

function ConnectionsPage() {
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [toast, setToast] = useState('')

  const load = useCallback(() => {
    fetch('/api/v1/config').then((r) => r.json()).then(setConfig).catch(() => {})
    fetch('/api/v1/health').then((r) => r.json()).then(setHealth).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2600) }

  const map = new Map(config.map((c) => [c.config_key, c.config_value]))
  const get = (k: string) => map.get(k) ?? ''
  const has = (k: string) => map.has(k)

  const flow = [
    { title: 'HQ pricing system', sub: 'Head office', icon: <ServerIcon size={19} /> },
    { title: 'Integrator', sub: 'Map & transform → MNT', icon: <SyncIcon size={19} />, self: true },
    { title: 'Xcenter inbound', sub: get('xcenter_inbound_path') || 'xcenter-inbound', icon: <FolderIcon size={19} /> },
  ]

  return (
    <div className="px-7 pt-[26px] pb-11 max-w-[1180px] mx-auto w-full flex flex-col gap-[22px]">
      <div>
        <h1 className="m-0 text-[21px] font-semibold tracking-tight">Connections</h1>
        <p className="mt-[5px] text-[13.5px] text-muted">Data flow and connector config owned by this system.</p>
      </div>

      {/* Data flow */}
      <section className="bg-surface border border-border rounded-2xl px-6 pt-6 pb-5">
        <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
          <div className="font-semibold text-sm">Data flow</div>
          <div className="text-[12.5px] text-muted">HQ price event → MNT file in Xcenter inbound</div>
        </div>
        <div className="flex items-stretch gap-2 overflow-x-auto pt-3 pb-1">
          {flow.map((f, i) => (
            <div key={i} className="flex items-center gap-2 flex-1 min-w-[150px]">
              <div className={
                'flex-1 rounded-xl p-3.5 flex flex-col gap-2.5 min-w-[150px] ' +
                (f.self ? 'border-[1.5px] border-accent bg-accent-weak relative' : 'border border-border bg-surface2')
              }>
                {f.self && (
                  <span className="absolute -top-2.5 left-3.5 bg-accent text-accent-text text-[9.5px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide">
                    this system
                  </span>
                )}
                <div className={
                  'w-[38px] h-[38px] rounded-[10px] grid place-items-center ' +
                  (f.self ? 'bg-accent text-accent-text' : 'bg-surface border border-border text-fg')
                }>
                  {f.icon}
                </div>
                <div>
                  <div className="font-semibold text-[13.5px]">{f.title}</div>
                  <div className="text-[11px] mt-0.5 break-all text-muted font-mono">{f.sub}</div>
                </div>
              </div>
              {i < flow.length - 1 && (
                <div className="text-faint flex-none"><ArrowRightIcon size={18} /></div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-[11.5px] text-faint">
          Ends at the Xcenter folder · Xstore delivery is out of scope.
        </div>
      </section>

      {/* Config cards */}
      <div className="font-semibold text-sm">Connectors &amp; config</div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-surface2 border border-border grid place-items-center flex-none"><ServerIcon /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px]">HQ intake</div>
              <div className="text-[11.5px] text-muted">Inbound · JSON price event</div>
            </div>
          </div>
          <ConfigField label="Endpoint" ck="_endpoint" value="POST /api/v1/price-events" present mono onSaved={load} showToast={showToast} />
          <ConfigField label="IP allowlist (ip_allowlist)" ck="ip_allowlist" value={get('ip_allowlist')} present={has('ip_allowlist')} mono onSaved={load} showToast={showToast} />
          <ConfigField label="Replay window — min (replay_skew_min)" ck="replay_skew_min" value={get('replay_skew_min')} present={has('replay_skew_min')} onSaved={load} showToast={showToast} />
          <div className="text-[11px] text-faint mt-auto pt-2 border-t border-border">
            4 intake guards: IP allowlist · HMAC-SHA256 · API key · timestamp.
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-surface2 border border-border grid place-items-center flex-none"><FolderIcon /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px]">Xcenter output</div>
              <div className="text-[11.5px] text-muted">Outbound · MNT file</div>
            </div>
          </div>
          <ConfigField label="Target folder (xcenter_inbound_path)" ck="xcenter_inbound_path" value={get('xcenter_inbound_path')} present={has('xcenter_inbound_path')} mono onSaved={load} showToast={showToast} />
          <ConfigField label="Filename pattern (filename_pattern)" ck="filename_pattern" value={get('filename_pattern')} present={has('filename_pattern')} mono onSaved={load} showToast={showToast} />
          <div className="text-[11px] text-faint mt-auto pt-2 border-t border-border">
            MNT written in place; <span className="font-mono">&lt;ts&gt;</span> keeps names unique on rewrite.
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-surface2 border border-border grid place-items-center flex-none"><SyncIcon size={17} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px]">Processing</div>
              <div className="text-[11.5px] text-muted">Business rules</div>
            </div>
          </div>
          <ConfigField label="Abort threshold — set-aside ratio (abort_threshold)" ck="abort_threshold" value={get('abort_threshold')} present={has('abort_threshold')} onSaved={load} showToast={showToast} />
          <div className="text-[11px] text-faint mt-auto pt-2 border-t border-border">
            Set-aside ratio above this aborts the batch (FAILED). 0.2 = 20%.
          </div>
        </div>
      </div>

      {/* Health strip */}
      <section className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3">
        <div className="font-semibold text-[13.5px]">Health (live check)</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {[
            { name: 'API', ok: !!health?.api },
            { name: 'Database', ok: !!health?.db },
          ].map((h) => (
            <div key={h.name} className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-lg bg-surface2">
              <span className={'w-2.5 h-2.5 rounded-full ' + (h.ok ? 'bg-green' : 'bg-accent')} />
              <span className="text-[12.5px] font-medium flex-1">{h.name}</span>
              <span className={'text-[11px] font-semibold ' + (h.ok ? 'text-green' : 'text-accent')}>{h.ok ? 'OK' : 'Down'}</span>
            </div>
          ))}
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg px-[18px] py-[11px] rounded-[10px] text-[13px] font-medium flex items-center gap-2 shadow-2xl"
             style={{ animation: 'toastin .2s ease' }}>
          <CheckIcon size={15} /> {toast}
        </div>
      )}
    </div>
  )
}
