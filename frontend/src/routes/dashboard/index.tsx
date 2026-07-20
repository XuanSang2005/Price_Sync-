import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { EventSummary, EventLog } from '../../types'
import { BATCH_STATUS_STYLES, BATCH_STATUS_ORDER, StatusText } from '../../components/StatusBadge'

// "/dashboard" — tổng quan: tracker batch mới nhất + đếm theo trạng thái
export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
})

// Định dạng thời gian cho stepper: "18 Jul 07:45:12"
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatStepTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' +
    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
  )
}

// Dấu check nhỏ vẽ bằng SVG (không icon lib)
function CheckMark() {
  return (
    <svg viewBox="0 0 12 12" className="w-3.5 h-3.5">
      <path
        d="M2.5 6.5l2.5 2.5 4.5-5"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Một bước trong stepper sau khi đã tính toán xong
type Step = {
  label: string
  state: 'done' | 'current' | 'todo' // xong / đang chạy / chưa tới
  sub: string // dòng phụ dưới tên bước (timestamp, "validate · map · build", hoặc "—")
  color: string // màu vòng tròn khi done (mặc định xanh dương, bước cuối theo kết quả)
}

// ===== Health check =====
// Chưa có Actuator ở backend → kiểm sức khỏe bằng cách ping API THẬT + đo độ trễ:
// - /events/metrics chứng minh API server sống
// - /config chứng minh DB đọc được (endpoint này query bảng config thật)
const CHECK_TARGETS = [
  { name: 'API server', url: '/api/v1/events/metrics' },
  { name: 'Database', url: '/api/v1/config' },
]

type HealthCheck = {
  name: string
  state: 'checking' | 'ok' | 'fail'
  latencyMs: number | null // độ trễ đo được (null = chưa đo xong / lỗi)
}

function DashboardPage() {
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [latest, setLatest] = useState<EventSummary | null>(null) // batch mới nhất
  const [logs, setLogs] = useState<EventLog[]>([]) // nhật ký của batch đó
  const [loading, setLoading] = useState(true)

  // Trạng thái từng health check (ban đầu = đang kiểm)
  const [checks, setChecks] = useState<HealthCheck[]>(
    CHECK_TARGETS.map((target) => ({ name: target.name, state: 'checking', latencyMs: null }))
  )
  const [checkedAt, setCheckedAt] = useState('') // giờ của lần kiểm gần nhất

  // Ping từng target: đo thời gian từ lúc gọi tới lúc có phản hồi
  function runHealthChecks() {
    CHECK_TARGETS.forEach((target, index) => {
      const startedAt = performance.now() // mốc bắt đầu (ms, độ chính xác cao)

      // helper: cập nhật ĐÚNG một check theo vị trí index, giữ nguyên các check khác
      function updateCheck(state: HealthCheck['state'], latencyMs: number | null) {
        setChecks((previous) =>
          previous.map((check, i) => (i === index ? { ...check, state, latencyMs } : check))
        )
      }

      fetch(target.url)
        .then((response) => {
          const latency = Math.round(performance.now() - startedAt)
          if (response.ok) {
            updateCheck('ok', latency)
          } else {
            updateCheck('fail', latency) // server trả lỗi (4xx/5xx)
          }
        })
        .catch(() => {
          updateCheck('fail', null) // không kết nối được (server sập / mất mạng)
        })
    })

    // ghi lại giờ kiểm (HH:mm:ss)
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    setCheckedAt(pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()))
  }

  // Kiểm ngay khi mở trang + tự kiểm lại mỗi 15 giây
  useEffect(() => {
    runHealthChecks()
    const timer = setInterval(runHealthChecks, 15000)
    // cleanup: rời trang thì DỪNG hẹn giờ (không dọn → interval chạy mãi, rò rỉ)
    return () => clearInterval(timer)
  }, [])

  // Tải số liệu + tìm batch mới nhất
  useEffect(() => {
    fetch('/api/v1/events/metrics')
      .then((response) => response.json())
      .then((data: Record<string, number>) => setMetrics(data))

    fetch('/api/v1/events')
      .then((response) => response.json())
      .then((data: EventSummary[]) => {
        if (data.length > 0) {
          // batch mới nhất = id lớn nhất
          const newestFirst = [...data].sort((a, b) => b.id - a.id)
          setLatest(newestFirst[0])
        }
        setLoading(false)
      })
  }, [])

  // Có batch mới nhất rồi → tải nhật ký của nó (để lấy timestamp từng mốc)
  useEffect(() => {
    if (latest !== null) {
      fetch('/api/v1/events/' + latest.id + '/logs')
        .then((response) => response.json())
        .then((data: EventLog[]) => setLogs(data))
    }
  }, [latest])

  if (loading) {
    return <p className="text-zinc-500 font-mono text-sm">Loading…</p>
  }

  // ===== Tính các bước của stepper từ nhật ký thật =====
  // Mốc nào đã ghi trong batch_log → lấy thời điểm ĐẦU TIÊN nó xuất hiện
  const reachedAt: Record<string, string> = {}
  for (const log of logs) {
    if (!(log.status in reachedAt)) {
      reachedAt[log.status] = log.created_at
    }
  }

  const terminal = latest === null ? '' : latest.status // trạng thái hiện tại của batch

  // Batch đã qua giai đoạn ghi file chưa (quyết định 2 bước cuối)
  const fileDone = terminal === 'WRITTEN' || terminal === 'PARTIAL'

  // Bước cuối đổi nhãn + màu theo kết quả thật
  let finalLabel = 'Written'
  let finalColor = 'bg-blue-600'
  let finalState: Step['state'] = 'todo'
  let finalSub = '—'
  if (terminal === 'WRITTEN') {
    finalState = 'done'
    finalSub = reachedAt['WRITTEN'] !== undefined ? formatStepTime(reachedAt['WRITTEN']) : '—'
  } else if (terminal === 'PARTIAL') {
    finalLabel = 'Partial'
    finalColor = 'bg-orange-500'
    finalState = 'done'
    finalSub = reachedAt['PARTIAL'] !== undefined ? formatStepTime(reachedAt['PARTIAL']) : '—'
  } else if (terminal === 'FAILED') {
    finalLabel = 'Failed'
    finalColor = 'bg-red-600'
    finalState = 'done'
    finalSub = reachedAt['FAILED'] !== undefined ? formatStepTime(reachedAt['FAILED']) : '—'
  } else if (terminal === 'PENDING_WRITE') {
    finalLabel = 'Pending write'
    finalColor = 'bg-amber-500'
    finalState = 'current'
    finalSub = reachedAt['PENDING_WRITE'] !== undefined ? formatStepTime(reachedAt['PENDING_WRITE']) : '—'
  }

  const steps: Step[] = [
    {
      label: 'Received',
      state: reachedAt['RECEIVED'] !== undefined ? 'done' : 'todo',
      sub: reachedAt['RECEIVED'] !== undefined ? formatStepTime(reachedAt['RECEIVED']) : '—',
      color: 'bg-blue-600',
    },
    {
      label: 'Processing',
      // đã claim → done; chưa claim mà batch mới nhận → đây là bước sắp tới (current)
      state: reachedAt['PROCESSING'] !== undefined ? (terminal === 'PROCESSING' ? 'current' : 'done') : terminal === 'RECEIVED' ? 'current' : 'todo',
      sub: terminal === 'PROCESSING' || terminal === 'RECEIVED'
        ? 'validate · map · build'
        : reachedAt['PROCESSING'] !== undefined ? formatStepTime(reachedAt['PROCESSING']) : '—',
      color: 'bg-blue-600',
    },
    {
      // backend không ghi mốc WRITING riêng → coi là xong khi file đã ghi
      label: 'Writing',
      state: fileDone ? 'done' : 'todo',
      sub: '—',
      color: 'bg-blue-600',
    },
    {
      label: finalLabel,
      state: finalState,
      sub: finalSub,
      color: finalColor,
    },
  ]

  // ===== Số liệu cho các ô đếm =====
  const orderedStatuses = BATCH_STATUS_ORDER.filter((status) => status in metrics)
  let total = 0
  for (const status of orderedStatuses) {
    total = total + metrics[status]
  }

  return (
    // Cột dọc phủ hết chiều cao còn lại của màn hình (100vh - nav 3.5rem - padding main 4rem),
    // justify-between giãn đều 3 khối: tracker / lưới số liệu / health
    <div className="flex flex-col justify-between min-h-[calc(100vh-8rem)]">
      {/* ===== Tracker batch mới nhất ===== */}
      {latest !== null && (
        <div className="border-y border-zinc-800/60 py-8">
          {/* Dòng đầu: tên batch + trạng thái */}
          <div className="flex items-center justify-between mb-8 font-mono">
            <div className="flex items-baseline gap-4">
              <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Latest batch
              </span>
              <Link
                to="/events/$id"
                params={{ id: String(latest.id) }}
                className="text-zinc-100 text-sm hover:underline underline-offset-4"
              >
                {latest.batch_id}
              </Link>
              <span className="text-zinc-600 text-sm">#{latest.id}</span>
            </div>
            <StatusText status={latest.status} />
          </div>

          {/* Stepper: bó vào giữa trang (max-w + mx-auto) */}
          <div className="flex items-start max-w-5xl mx-auto">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1
              return (
                // bước cuối không cần vạch nối → flex-none, bỏ khoảng chết phía sau
                <div key={index} className={isLast ? 'flex-none' : 'flex-1'}>
                  {/* Hàng trên: vòng tròn + vạch nối sang bước sau */}
                  <div className="flex items-center">
                    {step.state === 'done' ? (
                      // đã xong: tròn đặc màu + dấu check
                      <span className={'w-7 h-7 rounded-full flex items-center justify-center shrink-0 ' + step.color}>
                        <CheckMark />
                      </span>
                    ) : step.state === 'current' ? (
                      // đang chạy: tròn rỗng viền xanh
                      <span className="w-7 h-7 rounded-full border-2 border-blue-500/70 shrink-0" />
                    ) : (
                      // chưa tới: tròn rỗng viền mờ
                      <span className="w-7 h-7 rounded-full border-2 border-zinc-700/70 shrink-0" />
                    )}

                    {/* vạch nối (bỏ ở bước cuối); xanh khi bước này đã xong */}
                    {!isLast && (
                      <span
                        className={
                          'flex-1 h-0.5 mx-4 rounded-full ' +
                          (step.state === 'done' ? 'bg-blue-600' : 'bg-zinc-800')
                        }
                      />
                    )}
                  </div>

                  {/* Hàng dưới: canh GIỮA theo tâm vòng tròn —
                      ml-3.5 = nửa bề rộng tròn (28px/2), -translate-x-1/2 dịch ngược nửa bề rộng chữ */}
                  <div className="mt-3 ml-3.5 w-max -translate-x-1/2 text-center">
                    <div
                      className={
                        'text-sm font-semibold ' +
                        (step.state === 'todo' ? 'text-zinc-500' : 'text-zinc-100')
                      }
                    >
                      {step.label}
                    </div>
                    <div className="font-mono text-xs text-zinc-500 mt-1">{step.sub}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== Lưới số liệu: thẻ Tổng quan lớn (trái) + 2 nhóm trạng thái (phải) ===== */}
      <div className="grid grid-cols-12 gap-4">
        {/* --- Thẻ Tổng quan: số tổng + thanh tỉ lệ + legend gộp một chỗ --- */}
        <div className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
            Total batches
          </div>
          <div className="text-5xl font-semibold text-zinc-100 mt-3">{total}</div>

          {/* thanh tỉ lệ (chỉ vẽ trạng thái có batch) */}
          {total > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden gap-[2px] mt-6 mb-5">
              {orderedStatuses
                .filter((status) => metrics[status] > 0)
                .map((status) => {
                  const count = metrics[status]
                  const percent = (count / total) * 100
                  return (
                    <div
                      key={status}
                      className={BATCH_STATUS_STYLES[status].dot}
                      style={{ width: percent + '%' }}
                      title={status + ': ' + count + ' batch (' + Math.round(percent) + '%)'}
                    />
                  )
                })}
            </div>
          )}

          {/* legend: mỗi trạng thái có mặt một dòng — chấm + tên + số + % */}
          <div className="space-y-2.5 mt-auto">
            {orderedStatuses
              .filter((status) => metrics[status] > 0)
              .map((status) => {
                const count = metrics[status]
                const percent = Math.round((count / total) * 100)
                return (
                  <div key={status} className="flex items-center gap-2.5 text-sm">
                    <span className={'w-2 h-2 rounded-full ' + BATCH_STATUS_STYLES[status].dot} />
                    <span className="text-zinc-400">{status}</span>
                    <span className="ml-auto text-zinc-100 font-medium">{count}</span>
                    <span className="text-zinc-600 w-10 text-right font-mono text-xs">
                      {percent}%
                    </span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* --- Cột phải: nhóm Kết quả (ô lớn) + nhóm Đang xử lý (ô nhỏ) --- */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {/* Nhóm 1: KẾT QUẢ — 3 trạng thái chốt sổ, ô lớn nổi bật */}
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">
              Results
            </div>
            <div className="grid grid-cols-3 gap-4">
              {['WRITTEN', 'PARTIAL', 'FAILED'].map((status) => {
                const count = metrics[status] ?? 0
                const style = BATCH_STATUS_STYLES[status]
                const percent = total > 0 ? Math.round((count / total) * 100) : 0
                const failedRing = status === 'FAILED' && count > 0 ? ' ring-1 ring-red-500/40' : ''
                return (
                  <div
                    key={status}
                    className={
                      'bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors' +
                      failedRing
                    }
                  >
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <span className={'w-2 h-2 rounded-full ' + style.dot} />
                      {status}
                    </div>
                    {/* số 0 thì làm mờ cho đỡ nhiễu */}
                    <div
                      className={
                        'text-4xl font-semibold mt-2 ' +
                        (count === 0 ? 'text-zinc-600' : 'text-zinc-100')
                      }
                    >
                      {count}
                    </div>
                    <div className="font-mono text-xs text-zinc-600 mt-1.5">
                      {count === 0 ? '—' : percent + '% of total'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Nhóm 2: ĐANG XỬ LÝ — 4 trạng thái trung gian, ô gọn */}
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">
              In progress
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['RECEIVED', 'PROCESSING', 'WRITING', 'PENDING_WRITE'].map((status) => {
                const count = metrics[status] ?? 0
                const style = BATCH_STATUS_STYLES[status]
                return (
                  <div
                    key={status}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className={'w-1.5 h-1.5 rounded-full ' + style.dot} />
                      {status}
                    </div>
                    <div
                      className={
                        'text-2xl font-semibold mt-1.5 ' +
                        (count === 0 ? 'text-zinc-600' : 'text-zinc-100')
                      }
                    >
                      {count}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== System health: ping API thật + đo độ trễ, tự kiểm mỗi 15s ===== */}
      <div className="border-y border-zinc-800/60 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
              System
            </span>
            {/* dòng tổng kết: chỉ hiện khi CÓ SỰ CỐ (mọi thứ ổn thì im lặng) */}
            {checks.some((check) => check.state === 'fail') && (
              <span className="flex items-center gap-2 text-sm text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Issue detected
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {checkedAt !== '' && (
              <span className="font-mono text-xs text-zinc-600">checked at {checkedAt}</span>
            )}
            <button
              onClick={runHealthChecks}
              className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              Recheck
            </button>
          </div>
        </div>

        {/* Mỗi check một thẻ trải đầy hàng, viền/nền nhuộm nhẹ theo trạng thái */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {checks.map((check) => (
            <div
              key={check.name}
              className={
                'flex items-center justify-between rounded-xl border px-5 py-4 transition-colors ' +
                (check.state === 'ok'
                  ? 'border-emerald-500/15 bg-emerald-500/[0.03]'
                  : check.state === 'fail'
                    ? 'border-red-500/30 bg-red-500/[0.04]'
                    : 'border-zinc-800 bg-zinc-900/40')
              }
            >
              <div className="flex items-center gap-3">
                {/* chấm trạng thái có quầng sáng mờ (ring) */}
                <span
                  className={
                    'w-2 h-2 rounded-full ' +
                    (check.state === 'ok'
                      ? 'bg-emerald-400 ring-4 ring-emerald-400/15'
                      : check.state === 'fail'
                        ? 'bg-red-400 ring-4 ring-red-400/15'
                        : 'bg-zinc-500 animate-pulse')
                  }
                />
                <span className="text-sm text-zinc-200">{check.name}</span>
              </div>

              <div className="font-mono text-xs">
                {check.state === 'checking' ? (
                  <span className="text-zinc-500">checking…</span>
                ) : check.state === 'fail' ? (
                  <span className="text-red-400">
                    {check.latencyMs === null ? 'UNREACHABLE' : 'ERROR · ' + check.latencyMs + ' ms'}
                  </span>
                ) : (
                  <>
                    <span className="text-emerald-400">OK</span>
                    <span className="text-zinc-600"> · {check.latencyMs} ms</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
