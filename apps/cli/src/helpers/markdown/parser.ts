/**
 * Token types for markdown parsing
 */
export type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'code'; content: string }
  | { type: 'link'; text: string; url: string }

export type BlockToken =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; content: InlineToken[] }
  | { type: 'paragraph'; content: InlineToken[] }
  | { type: 'bullet'; content: InlineToken[] }
  | { type: 'codeblock'; language: string; content: string }
  | { type: 'divider' }

/**
 * Parse inline markdown (bold, italic, code, links)
 */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let remaining = text

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*|^__(.+?)__/)
    if (boldMatch) {
      tokens.push({ type: 'bold', content: boldMatch[1] ?? boldMatch[2] ?? '' })
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      tokens.push({ type: 'code', content: codeMatch[1] ?? '' })
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Italic: *text* or _text_ (but not ** or __)
    const italicMatch = remaining.match(/^\*([^*]+)\*|^_([^_]+)_/)
    if (italicMatch) {
      tokens.push({
        type: 'italic',
        content: italicMatch[1] ?? italicMatch[2] ?? '',
      })
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      tokens.push({
        type: 'link',
        text: linkMatch[1] ?? '',
        url: linkMatch[2] ?? '',
      })
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Plain text: consume until next special character or end
    const plainMatch = remaining.match(/^[^*_`[\]]+/)
    if (plainMatch) {
      tokens.push({ type: 'text', content: plainMatch[0] })
      remaining = remaining.slice(plainMatch[0].length)
      continue
    }

    // Single special character that didn't match patterns
    tokens.push({ type: 'text', content: remaining[0] ?? '' })
    remaining = remaining.slice(1)
  }

  return tokens
}

/**
 * Parse markdown text into block tokens
 */
export function parseMarkdown(text: string): BlockToken[] {
  const lines = text.split('\n')
  const tokens: BlockToken[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Code block: ```
    if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i]?.startsWith('```')) {
        codeLines.push(lines[i] ?? '')
        i++
      }
      tokens.push({
        type: 'codeblock',
        language,
        content: codeLines.join('\n'),
      })
      i++ // skip closing ```
      continue
    }

    // Horizontal rule: ---, ***, ___
    if (/^[-*_]{3,}$/.test(line.trim())) {
      tokens.push({ type: 'divider' })
      i++
      continue
    }

    // Heading: # ## ### etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1
      tokens.push({
        type: 'heading',
        level: Math.min(6, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5 | 6,
        content: parseInline(headingMatch[2] ?? ''),
      })
      i++
      continue
    }

    // Bullet point: - or *
    const bulletMatch = line.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      tokens.push({
        type: 'bullet',
        content: parseInline(bulletMatch[1] ?? ''),
      })
      i++
      continue
    }

    // Numbered list: 1. 2. etc. - treat as bullet
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/)
    if (numberedMatch) {
      tokens.push({
        type: 'bullet',
        content: parseInline(numberedMatch[1] ?? ''),
      })
      i++
      continue
    }

    // Regular paragraph
    tokens.push({
      type: 'paragraph',
      content: parseInline(line),
    })
    i++
  }

  return tokens
}
