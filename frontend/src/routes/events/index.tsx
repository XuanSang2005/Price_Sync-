import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { EventSummary } from '../../types'
import { StatusText, BATCH_STATUS_ORDER } from '../../components/StatusBadge'
import { formatTimeDate } from '../../utils/format'

// "/events" — danh sách batch, style terminal/mono: tab filter + bảng hairline
export const Route = createFileRoute('/events/')({
  component: EventsPage,
})

// Một tab filter phía trên bảng (ALL 12 / WRITTEN 6 / FAILED 6...)
// active = tab đang chọn → chữ sáng + gạch chân
function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'font-mono text-xs uppercase tracking-[0.25em] pb-1.5 border-b ' +
        (active
          ? 'text-zinc-100 border-zinc-100'
          : 'text-zinc-500 border-transparent hover:text-zinc-300')
      }
    >
      {label} {count}
    </button>
  )
}

function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL') // tab đang chọn ('ALL' hoặc tên status)

  useEffect(() => {
    fetch('/api/v1/events')
      .then((response) => {
        if (!response.ok) {
          throw new Error('API returned error ' + response.status)
        }
        return response.json()
      })
      .then((data: EventSummary[]) => {
        // Sắp id giảm dần → batch mới nhất lên đầu bảng
        const newestFirst = [...data].sort((a, b) => b.id - a.id)
        setEvents(newestFirst)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <p className="text-zinc-500 font-mono text-sm">Loading…</p>
  }

  if (error !== '') {
    return <p className="text-red-400 font-mono text-sm">Failed to load list: {error}</p>
  }

  // Các status CÓ MẶT trong dữ liệu (theo thứ tự vòng đời) → thành dãy tab
  const presentStatuses = BATCH_STATUS_ORDER.filter((status) =>
    events.some((event) => event.status === status)
  )

  // Danh sách hiển thị theo tab đang chọn
  const visibleEvents =
    filter === 'ALL' ? events : events.filter((event) => event.status === filter)

  return (
    <div className="border-y border-zinc-800/60 font-mono">
      {/* ===== Dãy tab filter ===== */}
      <div className="flex items-center gap-8 px-6 pt-5">
        <FilterTab
          label="All"
          count={events.length}
          active={filter === 'ALL'}
          onClick={() => setFilter('ALL')}
        />
        {presentStatuses.map((status) => (
          <FilterTab
            key={status}
            label={status}
            count={events.filter((event) => event.status === status).length}
            active={filter === status}
            onClick={() => setFilter(status)}
          />
        ))}
      </div>

      {/* ===== Bảng ===== */}
      {/* table-fixed = bề rộng cột KHÓA theo % khai ở thead — cột này đổi không xô cột kia */}
      <table className="w-full text-sm mt-4 table-fixed">
        <thead>
          <tr className="border-y border-zinc-800/60 text-left text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            <th className="w-[8%] px-6 py-3 font-normal">ID</th>
            <th className="w-[26%] pl-14 pr-6 py-3 font-normal">Batch</th>
            <th className="w-[18%] px-6 py-3 font-normal text-center">Version</th>
            <th className="w-[24%] pl-24 pr-6 py-3 font-normal">Status</th>
            <th className="w-[24%] px-6 py-3 font-normal text-right">Generated</th>
          </tr>
        </thead>
        <tbody>
          {visibleEvents.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                No events.
              </td>
            </tr>
          ) : (
            visibleEvents.map((event) => (
              <tr
                key={event.id}
                className="border-b border-zinc-800/40 last:border-0 hover:bg-zinc-900/40"
              >
                <td className="px-6 py-5 text-zinc-500">#{event.id}</td>
                <td className="pl-14 pr-6 py-5">
                  {/* Click tên batch → sang trang chi tiết */}
                  <Link
                    to="/events/$id"
                    params={{ id: String(event.id) }}
                    className="text-zinc-100 hover:text-white hover:underline underline-offset-4"
                  >
                    {event.batch_id}
                  </Link>
                </td>
                <td className="px-6 py-5 text-zinc-500 text-center">v{event.version}</td>
                <td className="pl-24 pr-6 py-5">
                  <StatusText status={event.status} />
                </td>
                <td className="px-6 py-5 text-zinc-500 text-right">
                  {formatTimeDate(event.generated_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
