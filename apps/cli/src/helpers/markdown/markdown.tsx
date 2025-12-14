import { Box, Text } from 'ink'
import React from 'react'

import { type BlockToken, type InlineToken, parseMarkdown } from './parser'

type MarkdownProps = {
  children: string
}

/**
 * Render markdown text in Ink
 */
export function Markdown({ children }: MarkdownProps): React.ReactElement {
  const tokens = parseMarkdown(children)

  return (
    <Box flexDirection="column">
      {tokens.map((token, i) => (
        <BlockTokenRenderer key={i} token={token} />
      ))}
    </Box>
  )
}

type BlockTokenRendererProps = {
  token: BlockToken
}

function BlockTokenRenderer({
  token,
}: BlockTokenRendererProps): React.ReactElement {
  switch (token.type) {
    case 'heading':
      return <HeadingRenderer level={token.level} content={token.content} />
    case 'paragraph':
      return (
        <Text>
          <InlineTokensRenderer tokens={token.content} />
        </Text>
      )
    case 'bullet':
      return (
        <Box>
          <Text> • </Text>
          <Text>
            <InlineTokensRenderer tokens={token.content} />
          </Text>
        </Box>
      )
    case 'codeblock':
      return (
        <Box
          marginY={1}
          paddingX={1}
          borderStyle="round"
          borderColor="gray"
          flexDirection="column"
        >
          {token.language && <Text dimColor>{token.language}</Text>}
          <Text color="cyan">{token.content}</Text>
        </Box>
      )
    case 'divider':
      return (
        <Box marginY={1}>
          <Text dimColor>{'─'.repeat(40)}</Text>
        </Box>
      )
  }
}

type HeadingRendererProps = {
  level: 1 | 2 | 3 | 4 | 5 | 6
  content: InlineToken[]
}

function HeadingRenderer({
  level,
  content,
}: HeadingRendererProps): React.ReactElement {
  // Style headings differently based on level
  const styles: Record<
    number,
    { color?: string; bold?: boolean; dimColor?: boolean }
  > = {
    1: { color: 'cyan', bold: true },
    2: { color: 'green', bold: true },
    3: { color: 'yellow', bold: true },
    4: { color: 'blue', bold: true },
    5: { color: 'magenta' },
    6: { dimColor: true },
  }

  const style = styles[level] ?? styles[6]

  return (
    <Box marginTop={level <= 2 ? 1 : 0}>
      <Text {...style}>
        <InlineTokensRenderer tokens={content} />
      </Text>
    </Box>
  )
}

type InlineTokensRendererProps = {
  tokens: InlineToken[]
}

function InlineTokensRenderer({
  tokens,
}: InlineTokensRendererProps): React.ReactElement {
  return (
    <>
      {tokens.map((token, i) => (
        <InlineTokenRenderer key={i} token={token} />
      ))}
    </>
  )
}

type InlineTokenRendererProps = {
  token: InlineToken
}

function InlineTokenRenderer({
  token,
}: InlineTokenRendererProps): React.ReactElement {
  switch (token.type) {
    case 'text':
      return <Text>{token.content}</Text>
    case 'bold':
      return <Text bold>{token.content}</Text>
    case 'italic':
      return <Text italic>{token.content}</Text>
    case 'code':
      return <Text color="cyan">{token.content}</Text>
    case 'link':
      return (
        <Text color="blue" underline>
          {token.text}
        </Text>
      )
  }
}
