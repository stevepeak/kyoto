interface GherkinViewerProps {
  text: string
}

export function GherkinViewer({ text }: GherkinViewerProps) {
  return (
    <pre className="rounded-md bg-background text-foreground p-4 overflow-auto text-sm leading-6 whitespace-pre-wrap border">
      {text}
    </pre>
  )
}
