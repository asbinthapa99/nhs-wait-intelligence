interface EmptyStateCardProps {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyStateCard({ title, body, actionLabel, onAction }: EmptyStateCardProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-[#222]">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[#888]">{body}</p>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-5 rounded-full border border-[#e5e5e5] px-4 py-2 text-sm font-medium text-[#444] transition-colors hover:bg-[#f9fafb]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
