import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/60 text-zinc-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl font-medium text-sm hover:bg-zinc-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
