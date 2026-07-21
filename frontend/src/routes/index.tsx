import { createFileRoute, redirect } from '@tanstack/react-router'

// "/" không có trang riêng → tự chuyển sang "/dashboard"
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})
