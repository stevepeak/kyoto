interface EmptyStateProps {
  kanji?: string
  kanjiTitle?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  kanji,
  kanjiTitle,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      {kanji ? (
        <p
          className="text-sm font-semibold tracking-[0.3em] text-primary mb-4"
          title={kanjiTitle}
        >
          {kanji}
        </p>
      ) : null}
      <h2 className="text-2xl font-display text-foreground mb-3">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground mb-8 max-w-md">
          {description}
        </p>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  )
}
