// Icon vẽ tay bằng SVG (không dùng thư viện icon). stroke=currentColor để ăn theo màu chữ.
type P = { size?: number; className?: string }

function svg(size: number, className: string | undefined, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  )
}

export const SyncIcon = ({ size = 18, className }: P) =>
  svg(size, className, (
    <>
      <polyline points="4 8 19 8" />
      <polyline points="15 4 19 8 15 12" />
      <polyline points="20 16 5 16" />
      <polyline points="9 12 5 16 9 20" />
    </>
  ))

export const GridIcon = ({ size = 17, className }: P) =>
  svg(size, className, (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.2" />
      <rect x="14" y="3" width="7" height="7" rx="1.2" />
      <rect x="3" y="14" width="7" height="7" rx="1.2" />
      <rect x="14" y="14" width="7" height="7" rx="1.2" />
    </>
  ))

export const BellIcon = ({ size = 17, className }: P) =>
  svg(size, className, (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ))

export const ListIcon = ({ size = 17, className }: P) =>
  svg(size, className, (
    <>
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="17" x2="14" y2="17" />
    </>
  ))

export const LinkIcon = ({ size = 17, className }: P) =>
  svg(size, className, (
    <>
      <path d="M10 13a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1.5 1.5" />
      <path d="M14 11a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1.5-1.5" />
    </>
  ))

export const ColumnsIcon = ({ size = 17, className }: P) =>
  svg(size, className, (
    <>
      <rect x="3" y="4" width="6" height="16" rx="1.2" />
      <rect x="15" y="4" width="6" height="16" rx="1.2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </>
  ))

export const SunIcon = ({ size = 16, className }: P) =>
  svg(size, className, (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.9" y1="4.9" x2="7" y2="7" />
      <line x1="17" y1="17" x2="19.1" y2="19.1" />
      <line x1="4.9" y1="19.1" x2="7" y2="17" />
      <line x1="17" y1="7" x2="19.1" y2="4.9" />
    </>
  ))

export const MoonIcon = ({ size = 16, className }: P) =>
  svg(size, className, <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 6.6 6.6 0 0 0 21 12.5z" />)

export const SearchIcon = ({ size = 15, className }: P) =>
  svg(size, className, (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.5" y2="16.5" />
    </>
  ))

export const CheckIcon = ({ size = 12, className }: P) =>
  svg(size, className, <polyline points="4 12 9 17 20 6" />)

export const XIcon = ({ size = 14, className }: P) =>
  svg(size, className, (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ))

export const AlertIcon = ({ size = 13, className }: P) =>
  svg(size, className, (
    <>
      <path d="M10.3 3.7 1.8 18a1.5 1.5 0 0 0 1.3 2.3h17.8a1.5 1.5 0 0 0 1.3-2.3L13.7 3.7a1.5 1.5 0 0 0-2.6 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ))

export const RefreshIcon = ({ size = 14, className }: P) =>
  svg(size, className, (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 3 21 9 15 9" />
    </>
  ))

export const DownloadIcon = ({ size = 14, className }: P) =>
  svg(size, className, (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ))

export const ServerIcon = ({ size = 17, className }: P) =>
  svg(size, className, (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <line x1="7" y1="7.5" x2="7.01" y2="7.5" />
      <line x1="7" y1="16.5" x2="7.01" y2="16.5" />
    </>
  ))

export const FolderIcon = ({ size = 17, className }: P) =>
  svg(size, className, <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />)

export const PlusIcon = ({ size = 13, className }: P) =>
  svg(size, className, (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ))

export const SaveIcon = ({ size = 15, className }: P) =>
  svg(size, className, (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ))

export const MenuIcon = ({ size = 18, className }: P) =>
  svg(size, className, (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ))

export const ArrowRightIcon = ({ size = 13, className }: P) =>
  svg(size, className, (
    <>
      <line x1="4" y1="12" x2="18" y2="12" />
      <polyline points="13 7 18 12 13 17" />
    </>
  ))
