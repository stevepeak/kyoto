import LinkComponent from 'ink-link'
import React from 'react'

// Type assertion to fix React 19 compatibility with ink-link
export const Link = LinkComponent as React.ComponentType<
  React.PropsWithChildren<{ url: string }>
>
