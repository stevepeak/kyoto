import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import { RangeSetBuilder, StateField } from '@codemirror/state'

export interface CodeMirrorViewerProps {
  value: string
  language:
    | 'typescript'
    | 'javascript'
    | 'tsx'
    | 'jsx'
    | 'astro'
    | 'html'
    | 'css'
  touchedLines?: number[]
  readOnly?: boolean
}

function getLanguageExtensions(language: CodeMirrorViewerProps['language']) {
  if (
    language === 'typescript' ||
    language === 'javascript' ||
    language === 'tsx' ||
    language === 'jsx'
  ) {
    return [javascript({ jsx: true, typescript: true })]
  }
  if (language === 'css') {
    return [css()]
  }
  // Approximate Astro with HTML highlighting
  return [html({ autoCloseTags: true, matchClosingTags: true })]
}

function buildTouchedLineDecorations(
  doc: string,
  touchedLines: number[] | undefined,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  if (!touchedLines || touchedLines.length === 0) {
    return builder.finish()
  }
  const lineBackground = Decoration.line({ class: 'cm-line-touched' })

  const lines = doc.split('\n')
  for (const n of touchedLines) {
    const idx = Math.max(1, Math.min(lines.length, n)) - 1
    const from = lines.slice(0, idx).reduce((acc, l) => acc + l.length + 1, 0)
    builder.add(from, from, lineBackground)
  }

  return builder.finish()
}

export function CodeMirrorViewer({
  value,
  language,
  touchedLines,
  readOnly = true,
}: CodeMirrorViewerProps) {
  const extensions = useMemo(() => getLanguageExtensions(language), [language])

  const decorationsField = useMemo(() => {
    const initial = buildTouchedLineDecorations(value, touchedLines)
    return StateField.define<DecorationSet>({
      create() {
        return initial
      },
      update(current) {
        return current
      },
      provide: (field) => EditorView.decorations.from(field),
    })
  }, [value, touchedLines])

  return (
    <div className="rounded-md border">
      <style>{`
        .cm-editor { background-color: transparent; }
        .cm-editor .cm-content { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
        .cm-scroller { overflow: auto; }
        .cm-gutters { background: transparent; border-right: 1px solid hsl(var(--border)); }
        .cm-activeLine, .cm-activeLineGutter { background-color: transparent !important; }
        .cm-line-touched { background-color: rgba(56, 139, 253, 0.12); /* GitHub info tint */ }
        .cm-line-touched-gutter::before { content: ' '; }
      `}</style>
      <CodeMirror
        value={value}
        readOnly={readOnly}
        height="auto"
        basicSetup={{ lineNumbers: true, highlightActiveLine: false }}
        extensions={[
          ...extensions,
          decorationsField,
          EditorView.editable.of(false),
        ]}
        theme={EditorView.theme({
          '&': { backgroundColor: 'transparent' },
          '.cm-gutters': { backgroundColor: 'transparent' },
        })}
      />
    </div>
  )
}

export default CodeMirrorViewer
