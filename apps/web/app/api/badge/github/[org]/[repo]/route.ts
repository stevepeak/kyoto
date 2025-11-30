import type { NextRequest } from 'next/server'

import { getRepoBadgeMetrics } from '@app/api'
import { getConfig } from '@app/config'
import { setupDb } from '@app/db'

type BadgeVariant = 'stories' | 'status'

interface BadgeSvgOptions {
  leftText: string
  rightText: string
  labelColor: string
  messageColor: string
}

function getVariant(request: NextRequest): BadgeVariant {
  const url = new URL(request.url)
  const variant = url.searchParams.get('variant')

  if (variant === 'status') {
    return 'status'
  }

  return 'stories'
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function estimateTextWidth(text: string): number {
  const baseWidth = 6
  const padding = 10

  return padding + text.length * baseWidth
}

function createBadgeSvg(options: BadgeSvgOptions): string {
  const leftTextEscaped = escapeXml(options.leftText)
  const rightTextEscaped = escapeXml(options.rightText)

  const leftWidth = estimateTextWidth(options.leftText)
  const rightWidth = estimateTextWidth(options.rightText)
  const width = leftWidth + rightWidth
  const height = 20
  const radius = 3
  const textY = 14

  const leftTextX = leftWidth / 2
  const rightTextX = leftWidth + rightWidth / 2

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${leftTextEscaped}: ${rightTextEscaped}">\n` +
    `<rect width="${width}" height="${height}" fill="${options.labelColor}" rx="${radius}"/>\n` +
    `<rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${options.messageColor}" rx="${radius}"/>\n` +
    `<g fill="#fff" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="11">\n` +
    `<text x="${leftTextX}" y="${textY}">${leftTextEscaped}</text>\n` +
    `<text x="${rightTextX}" y="${textY}">${rightTextEscaped}</text>\n` +
    `</g>\n` +
    `</svg>\n`
}

export async function GET(
  request: NextRequest,
  context: { params: { org: string; repo: string } },
) {
  const { org, repo } = context.params
  const variant = getVariant(request)

  const headers = new Headers({
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'X-Robots-Tag': 'noindex, nofollow, noimageindex',
    'Cache-Control': 'public, max-age=300, s-maxage=300',
  })

  try {
    const env = getConfig()
    const db = setupDb(env.DATABASE_URL)

    const metrics = await getRepoBadgeMetrics({
      db,
      orgName: org,
      repoName: repo,
      secret: env.TRIGGER_SECRET_KEY,
    })

    const rightText =
      variant === 'status'
        ? metrics.statusLabel
        : `${metrics.storyCount} User Stories`

    const messageColor =
      variant === 'status'
        ? metrics.statusLabel === 'Operational'
          ? '#4c1'
          : '#e05d44'
        : '#007ec6'

    const svg = createBadgeSvg({
      leftText: 'Kyoto',
      rightText,
      labelColor: '#555',
      messageColor,
    })

    return new Response(svg, { status: 200, headers })
  } catch (error) {
    console.error('Failed to render badge:', error)

    const svg = createBadgeSvg({
      leftText: 'Kyoto',
      rightText: 'Status Unknown',
      labelColor: '#555',
      messageColor: '#9f9f9f',
    })

    return new Response(svg, { status: 200, headers })
  }
}
