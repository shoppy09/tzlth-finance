'use client'

export function DeleteModal({ message, onConfirm, onCancel }: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4">
        <p className="text-white text-sm">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            確認刪除
          </button>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
