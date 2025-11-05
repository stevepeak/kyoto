interface StoryItem {
  id: string
  title: string
  featureTitle: string
  updatedAt?: string
  href: string
}

interface StoryListProps {
  stories: StoryItem[]
}

export function StoryList({ stories }: StoryListProps) {
  return (
    <ul className="divide-y">
      {stories.map((s) => (
        <li key={s.id} className="py-3">
          <a href={s.href} className="text-foreground hover:underline">
            <div className="font-medium">{s.featureTitle || s.title}</div>
            {s.updatedAt ? (
              <div className="text-xs text-muted-foreground mt-1">
                Updated {s.updatedAt}
              </div>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  )
}
