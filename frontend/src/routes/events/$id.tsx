import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { EventDetail, EventLog } from '../../types'
import { StatusBadge, RecordBadge, BATCH_STATUS_STYLES } from '../../components/StatusBadge'
import { formatDateTime } from '../../utils/format'

// "/events/$id" — chi tiết 1 batch. "$id" = tham số động trong URL.
export const Route = createFileRoute('/events/$id')({
  component: EventDetailPage,
})

function EventDetailPage() {
  // đọc "id" từ URL (vd /events/107 → id = "107")
  const { id } = Route.useParams()

  const [detail, setDetail] = useState<EventDetail | null>(null) // null = chưa tải xong
  const [logs, setLogs] = useState<EventLog[]>([]) // nhật ký vòng đời
  const [error, setError] = useState('')
  const [retryMessage, setRetryMessage] = useState('') // thông báo sau khi bấm Retry
  const [retrying, setRetrying] = useState(false) // đang gửi retry → khóa nút

  // Tải chi tiết batch + nhật ký (gọi lúc mở trang, và gọi lại sau khi Retry)
  function loadAll() {
    fetch('/api/v1/events/' + id)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Batch #' + id + ' not found' : 'Error ' + response.status)
        }
        return response.json()
      })
      .then((data: EventDetail) => setDetail(data))
      .catch((err: Error) => setError(err.message))

    fetch('/api/v1/events/' + id + '/logs')
      .then((response) => response.json())
      .then((data: EventLog[]) => setLogs(data))
  }

  useEffect(() => {
    loadAll()
  }, [id])

  // Bấm nút Retry: POST /events/{id}/retry → backend redrive batch FAILED
  function handleRetry() {
    setRetrying(true)
    fetch('/api/v1/events/' + id + '/retry', { method: 'POST' })
      .then((response) => {
        if (response.status === 202) {
          setRetryMessage('Reprocessing triggered — the batch will be retried shortly.')
        } else {
          setRetryMessage('Batch is not in FAILED status — nothing to retry.')
        }
        setRetrying(false)
        loadAll() // tải lại để thấy status mới (FAILED → PENDING_WRITE)
      })
      .catch(() => {
        setRetryMessage('Retry request failed — check the backend.')
        setRetrying(false)
      })
  }

  if (error !== '') {
    return (
      <div>
        <Link to="/events" className="text-zinc-400 hover:text-zinc-100 text-sm">
          ← Back to list
        </Link>
        <p className="mt-4 text-red-400">{error}</p>
      </div>
    )
  }

  if (detail === null) {
    return <p className="text-zinc-500">Loading…</p>
  }

  return (
    <div>
      <Link to="/events" className="text-zinc-400 hover:text-zinc-100 text-sm">
        ← Back to list
      </Link>

      {/* ===== Thẻ thông tin batch ===== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-100">{detail.batch_id}</h1>
            <StatusBadge status={detail.status} />
          </div>

          {/* Nút Retry — chỉ hiện khi batch FAILED (chức năng re-drive của operator) */}
          {detail.status === 'FAILED' && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600/90 text-white hover:bg-red-600 disabled:opacity-50"
            >
              {retrying ? 'Sending…' : 'Retry batch'}
            </button>
          )}
        </div>

        {/* Thông báo kết quả retry (nếu có) */}
        {retryMessage !== '' && <p className="mt-3 text-sm text-blue-400">{retryMessage}</p>}

        {/* Các thông số phụ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 text-sm">
          <div>
            <div className="text-zinc-500">ID</div>
            <div className="font-mono text-zinc-300">#{detail.id}</div>
          </div>
          <div>
            <div className="text-zinc-500">Version</div>
            <div className="text-zinc-300">v{detail.version}</div>
          </div>
          <div>
            <div className="text-zinc-500">Generated</div>
            <div className="text-zinc-300">{formatDateTime(detail.generated_at)}</div>
          </div>
        </div>
      </div>

      {/* ===== 2 cột: Records (trái, rộng) + Timeline (phải) ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* --- Bảng records --- */}
        <div className="lg:col-span-2">
          <h2 className="font-medium text-zinc-200 mb-3">
            Records <span className="text-zinc-500 font-normal">({detail.records.length})</span>
          </h2>

          {detail.records.length === 0 ? (
            <p className="text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              This batch has no records.
            </p>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-left text-zinc-500 text-xs uppercase tracking-wider">
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 font-medium">Change</th>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Store/Zone</th>
                    <th className="px-4 py-3 font-medium">Validation</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.records.map((record, index) => (
                    <tr key={index} className="border-b border-zinc-800/60 last:border-0">
                      <td className="px-4 py-3 font-mono text-zinc-400">{record.change_id}</td>
                      <td className="px-4 py-3 text-zinc-300">{record.item_id}</td>
                      <td className="px-4 py-3 text-zinc-300">{record.store_id_or_zone}</td>
                      <td className="px-4 py-3">
                        <RecordBadge status={record.validation_status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {/* reason có thể null → hiện gạch ngang */}
                        {record.set_aside_reason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* --- Timeline nhật ký vòng đời (audit log) --- */}
        <div>
          <h2 className="font-medium text-zinc-200 mb-3">Processing history</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            {logs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No history yet.</p>
            ) : (
              <ol className="relative border-l border-zinc-800 ml-2 space-y-5">
                {logs.map((log, index) => {
                  // chấm màu theo trạng thái (cùng bảng màu với badge)
                  const dotColor = BATCH_STATUS_STYLES[log.status]?.dot ?? 'bg-zinc-400'
                  return (
                    <li key={index} className="ml-4">
                      {/* chấm tròn nằm đè lên đường kẻ dọc; ring cùng màu nền thẻ */}
                      <span
                        className={
                          'absolute -left-[6.5px] w-3 h-3 rounded-full ring-4 ring-zinc-900 ' +
                          dotColor
                        }
                      />
                      <div className="text-sm font-medium text-zinc-200">{log.status}</div>
                      {log.note !== null && <div className="text-xs text-zinc-500">{log.note}</div>}
                      <div className="text-xs text-zinc-600 mt-0.5">
                        {formatDateTime(log.created_at)}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
