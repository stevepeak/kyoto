'use client'

import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

interface ShikiCodeBlockProps {
  code: string
  language: string
  fileName?: string
  githubUrl?: string
}

export function ShikiCodeBlock({
  code,
  language,
  fileName,
  githubUrl,
}: ShikiCodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const highlightCode = async () => {
      try {
        const highlighted = await codeToHtml(code, {
          lang: language,
          theme: 'github-light',
        })
        setHtml(highlighted)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to highlight code:', error)
        setHtml(`<pre><code>${code}</code></pre>`)
      } finally {
        setIsLoading(false)
      }
    }

    void highlightCode()
  }, [code, language])

  const hasHeader = fileName || githubUrl

  if (isLoading) {
    return (
      <div className="shiki-container">
        {hasHeader && (
          <div className="shiki-header">
            {fileName && <span className="shiki-file-name">{fileName}</span>}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shiki-header-link"
              >
                View on GitHub
              </a>
            )}
          </div>
        )}
        <pre className="shiki">
          <code>{code}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className="shiki-container">
      {hasHeader && (
        <div className="shiki-header">
          {fileName && <span className="shiki-file-name">{fileName}</span>}
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shiki-header-link"
            >
              View on GitHub
            </a>
          )}
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
