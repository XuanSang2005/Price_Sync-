import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import type { EventSummary } from '../types'
import { StatusText } from '../components/StatusBadge'
import { formatDateTime } from '../utils/format'

// __root = layout chung cho MỌI trang: header trên cùng + chỗ hiện trang con (<Outlet/>)
export const Route = createRootRoute({
  component: RootLayout,
})

// Một link trên thanh nav — TanStack tự thêm class "active" khi đang ở trang đó
function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-lg text-[15px] text-zinc-400 hover:text-zinc-100 [&.active]:text-zinc-100 [&.active]:bg-zinc-800"
    >
      {label}
    </Link>
  )
}

// Các trạng thái operator cần để mắt tới (hiện trong sidebar "Cần chú ý")
const ATTENTION_STATUSES = ['FAILED', 'PENDING_WRITE', 'PARTIAL']

function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false) // sidebar đang mở hay không
  const [events, setEvents] = useState<EventSummary[]>([]) // dữ liệu cho sidebar

  // Mỗi lần mở sidebar → tải danh sách events mới nhất (để 2 mục luôn tươi)
  useEffect(() => {
    if (menuOpen) {
      fetch('/api/v1/events')
        .then((response) => response.json())
        .then((data: EventSummary[]) => setEvents(data))
    }
  }, [menuOpen])

  // Mục "Cần chú ý": batch đang FAILED / PENDING_WRITE / PARTIAL
  const needAttention = events.filter((event) => ATTENTION_STATUSES.includes(event.status))

  // Mục "Hoạt động gần đây": 5 batch mới nhất (id lớn nhất)
  const recentActivity = [...events].sort((a, b) => b.id - a.id).slice(0, 5)

  // Hover mở/đóng drawer — đóng có trễ nhỏ để di chuột từ hamburger sang drawer không bị coi là rời ra
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function openMenu() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
    }
    setMenuOpen(true)
  }
  function closeMenu() {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 120)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* ===== Header: 3 vùng — logo trái / nav giữa / hamburger phải ===== */}
      <nav className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/60 shadow-lg shadow-black/30">
        <div className="max-w-screen-2xl mx-auto px-8 h-16 grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Trái: chỉ wordmark, giữ clean. h-full + items-center = căn giữa dọc chính xác */}
          <div className="flex items-center h-full">
            <span className="text-2xl font-semibold tracking-tight text-zinc-100 leading-none">
              Price Sync
            </span>
          </div>

          {/* Giữa: nav canh giữa tuyệt đối (cột giữa của grid) */}
          <div className="flex items-center gap-1">
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/events" label="Events" />
            <NavItem to="/config" label="Config" />
          </div>

          {/* Phải: hamburger — hover vào là mở sidebar (wrapper ôm cả nút lẫn panel
              để chuột di từ nút xuống panel không bị coi là rời ra) */}
          <div
            className="justify-self-end h-16 flex items-center"
            onMouseEnter={openMenu}
            onMouseLeave={closeMenu}
          >
            <button
              aria-label="Open monitor panel"
              className={
                'w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-lg hover:bg-zinc-800 transition-transform duration-300 ' +
                (menuOpen ? '-rotate-90' : '')
              }
            >
              {/* icon hamburger 3 vạch CSS — hover xoay 90° thành 3 vạch dọc */}
              <span className="block w-4 h-px bg-zinc-400" />
              <span className="block w-4 h-px bg-zinc-400" />
              <span className="block w-4 h-px bg-zinc-400" />
            </button>
          </div>
        </div>
      </nav>

      {/* ===== Drawer theo dõi: trượt ngang từ mép phải vào, cao full trừ header.
           Đặt NGOÀI <nav> vì backdrop-blur của nav tạo containing-block làm fixed lệch. ===== */}
      <aside
        onMouseEnter={openMenu}
        onMouseLeave={closeMenu}
        className={
          'fixed top-16 right-0 z-30 h-[calc(100vh-4rem)] w-80 bg-zinc-900 border-l border-zinc-800/80 shadow-2xl shadow-black/50 overflow-y-auto transition-transform duration-300 ease-out ' +
          (menuOpen ? 'translate-x-0' : 'translate-x-full')
        }
      >
        <div className="p-6">
          {/* Needs attention */}
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Needs attention</span>
            {needAttention.length > 0 && (
              <span className="font-mono text-xs text-amber-400/80">{needAttention.length}</span>
            )}
          </div>
          {needAttention.length === 0 ? (
            <p className="text-sm text-zinc-600 mb-9">Nothing needs attention.</p>
          ) : (
            <ul className="space-y-0.5 mb-9">
              {needAttention.map((event) => (
                <li key={event.id}>
                  <Link
                    to="/events/$id"
                    params={{ id: String(event.id) }}
                    className="block rounded-lg -mx-2 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="font-mono text-sm text-zinc-200 truncate mb-2">{event.batch_id}</div>
                    <StatusText status={event.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Recent activity */}
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-3">Recent activity</div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-600">No data yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {recentActivity.map((event) => (
                <li key={event.id}>
                  <Link
                    to="/events/$id"
                    params={{ id: String(event.id) }}
                    className="block rounded-lg -mx-2 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-mono text-sm text-zinc-200 truncate">{event.batch_id}</span>
                      <span className="font-mono text-[11px] text-zinc-600 shrink-0">
                        {formatDateTime(event.generated_at)}
                      </span>
                    </div>
                    <StatusText status={event.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Trang con (theo URL) hiện vào đây */}
      <main className="max-w-screen-2xl mx-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
