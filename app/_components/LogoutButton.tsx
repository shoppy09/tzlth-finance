'use client'

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="text-xs text-gray-600 hover:text-red-400 transition-colors"
      >
        登出
      </button>
    </form>
  )
}
