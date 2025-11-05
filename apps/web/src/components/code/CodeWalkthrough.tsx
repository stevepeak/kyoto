import CodeMirrorViewer from './CodeMirrorViewer'

export interface WalkthroughFileItem {
  path: string
  summary?: string
  language:
    | 'typescript'
    | 'javascript'
    | 'tsx'
    | 'jsx'
    | 'astro'
    | 'html'
    | 'css'
  content: string
  touchedLines?: number[]
}

export interface CodeWalkthroughProps {
  files: WalkthroughFileItem[]
}

export function CodeWalkthrough({ files }: CodeWalkthroughProps) {
  return (
    <div className="flex flex-col gap-6">
      {files.map((file) => (
        <div key={file.path} className="rounded-md border">
          <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between">
            <div className="text-xs font-medium text-foreground">
              <span className="font-mono">{file.path}</span>
            </div>
            {file.summary ? (
              <div className="text-xs text-muted-foreground ml-3">
                {file.summary}
              </div>
            ) : null}
          </div>
          <div className="p-3">
            <CodeMirrorViewer
              value={file.content}
              language={file.language}
              touchedLines={file.touchedLines}
            />
          </div>
        </div>
      ))}
      {files.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No files recorded for this story.
        </div>
      ) : null}
    </div>
  )
}

export default CodeWalkthrough
