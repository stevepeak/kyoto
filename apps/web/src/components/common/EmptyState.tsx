interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description ? <p className="mt-2 text-sm max-w-md">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}


