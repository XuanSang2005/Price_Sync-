import { createRootRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import type { EventSummary, Health } from '../types'
import { useTheme } from '../lib/theme'
import { StatusDot } from '../lib/status'
import {
  SyncIcon, GridIcon, BellIcon, ListIcon, LinkIcon, ColumnsIcon,
  SunIcon, MoonIcon, MenuIcon,
} from '../components/icons'

export const Route = createRootRoute({ component: RootLayout })

// Các trạng thái operator cần để mắt (cho badge + dropdown chuông)
const ATTENTION = ['FAILED', 'PENDING_WRITE', 'PARTIAL']

// Class cho một mục nav (đổi theo đang chọn hay không)
function navClass(active: boolean) {
  return (
    'flex items-center gap-3 px-3 py-[9px] rounded-[9px] text-[13.5px] font-medium cursor-pointer border border-transparent transition-colors ' +
    (active
      ? 'bg-accent-weak text-accent font-semibold'
      : 'text-muted hover:bg-surface2 hover:text-fg')
  )
}

function RootLayout() {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventSummary[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false) // sidebar đang trượt ra hay thu vào

  // Nạp events + health định kỳ để badge/chuông/đèn "Connected" luôn tươi
  useEffect(() => {
    function load() {
      fetch('/api/v1/events')
        .then((r) => r.json())
        .then((d: EventSummary[]) => setEvents(d))
        .catch(() => {})
      fetch('/api/v1/health')
        .then((r) => r.json())
        .then((d: Health) => setHealth(d))
        .catch(() => setHealth({ status: 'degraded', api: false, db: false, checked_at: '' }))
    }
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  // Mở/đóng sidebar bằng hover. Đóng có trễ nhỏ để chuột đi từ hamburger sang sidebar
  // không bị coi là rời ra (giống cách drawer cũ hoạt động).
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenuOpen(true)
  }
  function closeMenu() {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150)
  }

  const attention = [...events]
    .filter((e) => ATTENTION.includes(e.status))
    .sort((a, b) => b.id - a.id)
  const connected = health?.api && health?.db

  return (
    <div className="min-h-screen bg-bg text-fg font-sans text-sm">
      {/* Vùng cảm ứng sát mép trái: rê chuột vào đây cũng mở sidebar (kể cả khi hamburger bị che) */}
      <div
        onMouseEnter={openMenu}
        onMouseLeave={closeMenu}
        className="fixed left-0 top-0 h-screen w-2 z-30"
      />

      {/* ===== Sidebar overlay: trượt từ trái ra khi hover, thu vào khi rời ===== */}
      <aside
        onMouseEnter={openMenu}
        onMouseLeave={closeMenu}
        className={
          'fixed left-0 top-0 h-screen w-[248px] z-40 bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-out ' +
          (menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full')
        }
      >
        <nav className="px-3 pt-5 pb-3.5 flex flex-col gap-[3px] flex-1 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-[0.06em] text-faint px-2.5 pt-1 pb-2 font-semibold">
            Monitor
          </div>
          <Link to="/dashboard" className="block" onClick={() => setMenuOpen(false)}>
            {({ isActive }) => (
              <div className={navClass(isActive)}>
                <GridIcon />
                <span>Dashboard</span>
              </div>
            )}
          </Link>
          <Link to="/events" className="block" onClick={() => setMenuOpen(false)}>
            {({ isActive }) => (
              <div className={navClass(isActive)}>
                <BellIcon />
                <span className="flex-1">Events</span>
                {attention.length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-text text-[10px] font-bold grid place-items-center">
                    {attention.length}
                  </span>
                )}
              </div>
            )}
          </Link>
          <Link to="/logs" className="block" onClick={() => setMenuOpen(false)}>
            {({ isActive }) => (
              <div className={navClass(isActive)}>
                <ListIcon />
                <span>Logs</span>
              </div>
            )}
          </Link>

          <div className="text-[11px] uppercase tracking-[0.06em] text-faint px-2.5 pt-4 pb-2 font-semibold">
            Configure
          </div>
          <Link to="/connections" className="block" onClick={() => setMenuOpen(false)}>
            {({ isActive }) => (
              <div className={navClass(isActive)}>
                <LinkIcon />
                <span>Connections</span>
              </div>
            )}
          </Link>
          <Link to="/mapping" className="block" onClick={() => setMenuOpen(false)}>
            {({ isActive }) => (
              <div className={navClass(isActive)}>
                <ColumnsIcon />
                <span>Field mapping</span>
              </div>
            )}
          </Link>
        </nav>

        <div className="px-4 py-[13px] border-t border-border text-[11.5px] text-muted flex flex-col gap-[3px]">
          <div>Build 2.4.0 · UAT</div>
          <div className="font-mono text-[10.5px] text-faint">price-events · v1</div>
        </div>
      </aside>

      {/* ===== Main (full width; sidebar trượt ĐÈ lên khi mở) ===== */}
      <main className="flex flex-col h-screen">
        <header className="h-[58px] flex-none border-b border-border bg-surface flex items-center justify-between px-[22px] relative z-20">
          <div className="flex items-center gap-[11px]">
            {/* Hamburger: hover để mở sidebar, bấm để ghim mở/đóng */}
            <button
              onMouseEnter={openMenu}
              onMouseLeave={closeMenu}
              onClick={() => setMenuOpen((o) => !o)}
              className="w-[34px] h-[34px] rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer hover:bg-border flex-none"
              title="Menu"
              aria-label="Open menu"
            >
              <MenuIcon size={18} />
            </button>
            <div className="w-[27px] h-[27px] rounded-md bg-accent-weak text-accent grid place-items-center flex-none">
              <SyncIcon size={15} />
            </div>
            <div className="font-semibold text-[15px] tracking-tight">Price integration console</div>
          </div>
          <div className="flex items-center gap-[11px]">
            <span className="font-mono text-[11px] font-medium text-muted border border-border px-[9px] py-1 rounded-md bg-surface2">
              UAT
            </span>
            <span className="flex items-center gap-[7px] text-[12.5px] font-medium border border-border px-3 py-1 rounded-full bg-surface2">
              <span
                className={'w-2 h-2 rounded-full ' + (connected ? 'bg-green' : 'bg-accent')}
                style={{ animation: 'pip 2.4s ease-in-out infinite' }}
              />
              {connected ? 'Connected' : 'Disconnected'}
            </span>

            {/* Chuông cảnh báo */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="w-[34px] h-[34px] rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer relative hover:bg-border"
                title="Alerts"
              >
                <BellIcon size={16} />
                {attention.length > 0 && (
                  <span className="absolute -top-[5px] -right-[5px] min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-text text-[10px] font-bold grid place-items-center border-2 border-surface">
                    {attention.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  className="absolute right-0 top-[42px] w-[320px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-40"
                  style={{ animation: 'fadein .12s ease' }}
                >
                  <div className="px-3.5 py-3 border-b border-border font-semibold text-[13px] flex justify-between items-center">
                    Alerts
                    <span className="text-[11px] text-muted font-medium">{attention.length} open</span>
                  </div>
                  {attention.length === 0 ? (
                    <div className="px-3.5 py-5 text-[12.5px] text-muted text-center">
                      All clear.
                    </div>
                  ) : (
                    attention.slice(0, 6).map((e) => (
                      <div
                        key={e.id}
                        onClick={() => {
                          setNotifOpen(false)
                          navigate({ to: '/events/$id', params: { id: String(e.id) } })
                        }}
                        className="px-3.5 py-[11px] border-b border-border cursor-pointer flex gap-2.5 items-start hover:bg-surface2"
                      >
                        <span className="mt-1">
                          <StatusDot status={e.status} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium truncate">{e.batch_id}</div>
                          <div className="text-[11px] text-muted font-mono">{e.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                  <div
                    onClick={() => {
                      setNotifOpen(false)
                      navigate({ to: '/events' })
                    }}
                    className="px-3.5 py-2.5 text-[12px] text-accent font-semibold cursor-pointer text-center hover:bg-surface2"
                  >
                    View all events
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggle}
              className="w-[34px] h-[34px] rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer hover:bg-border"
              title="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
