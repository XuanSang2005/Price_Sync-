// Quản lý theme sáng/tối. Chỉ đổi thuộc tính data-theme trên <html>; CSS vars trong
// index.css lo phần đổi màu. Lưu lựa chọn vào localStorage để nhớ giữa các lần mở.
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'price-sync-theme'

function readInitial(): Theme {
  const saved = localStorage.getItem(KEY)
  return saved === 'dark' ? 'dark' : 'light' // mặc định sáng, theo mock
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitial)

  useEffect(() => {
    apply(theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggle }
}
