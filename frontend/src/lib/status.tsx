// Bảng màu trạng thái, dùng CHUNG mọi trang. Các class là chuỗi TĨNH đầy đủ để Tailwind
// quét thấy (không ghép động). Màu ánh xạ từ token: green=xong, amber=chờ/một phần, accent(đỏ)=lỗi.
import type { ReactNode } from 'react'

type Tone = { text: string; bg: string; dot: string }

const BATCH: Record<string, Tone> = {
  RECEIVED: { text: 'text-muted', bg: 'bg-surface2', dot: 'bg-faint' },
  PROCESSING: { text: 'text-muted', bg: 'bg-surface2', dot: 'bg-muted' },
  WRITING: { text: 'text-muted', bg: 'bg-surface2', dot: 'bg-muted' },
  PENDING_WRITE: { text: 'text-amber', bg: 'bg-amber-bg', dot: 'bg-amber' },
  WRITTEN: { text: 'text-green', bg: 'bg-green-bg', dot: 'bg-green' },
  PARTIAL: { text: 'text-amber', bg: 'bg-amber-bg', dot: 'bg-amber' },
  FAILED: { text: 'text-accent', bg: 'bg-accent-weak', dot: 'bg-accent' },
}
const FALLBACK: Tone = { text: 'text-muted', bg: 'bg-surface2', dot: 'bg-faint' }

export function batchTone(status: string): Tone {
  return BATCH[status] ?? FALLBACK
}

// Nhãn viên thuốc (pill) có chấm màu + tên trạng thái
export function StatusPill({ status }: { status: string }) {
  const t = batchTone(status)
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ' +
        t.text + ' ' + t.bg
      }
    >
      <span className={'w-1.5 h-1.5 rounded-full ' + t.dot} />
      {status}
    </span>
  )
}

// Chỉ chấm màu (không chữ) — cho danh sách gọn
export function StatusDot({ status }: { status: string }) {
  const t = batchTone(status)
  return <span className={'w-[7px] h-[7px] rounded-full shrink-0 ' + t.dot} />
}

// Trạng thái từng record (VALID/SET_ASIDE/SUPERSEDED/PENDING)
const RECORD: Record<string, string> = {
  VALID: 'text-green bg-green-bg',
  PENDING: 'text-muted bg-surface2',
  SET_ASIDE: 'text-amber bg-amber-bg',
  SUPERSEDED: 'text-faint bg-surface2',
}

export function RecordPill({ status }: { status: string }) {
  const cls = RECORD[status] ?? 'text-muted bg-surface2'
  return <span className={'inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold ' + cls}>{status}</span>
}

// Bọc icon + chữ cho tiêu đề mục nhỏ
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.05em] text-faint font-semibold">{children}</div>
  )
}
