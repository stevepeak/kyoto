import { findGitRoot } from '@app/shell'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { randomUUID } from 'node:crypto'
import React, { useEffect, useState } from 'react'

import { pwdKyoto } from '../helpers/config/find-kyoto-dir'
import { getConfig } from '../helpers/config/get'
import { updateConfigJson } from '../helpers/config/update'

// Default to localhost:3002 for development
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:3002'

export default function Login() {
  const [state] = useState(randomUUID())
  const [status, setStatus] = useState<
    'init' | 'waiting' | 'success' | 'error'
  >('init')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null)

  const loginUrl = `${WEB_APP_URL}/cli/login?state=${state}`

  useEffect(() => {
    setStatus('waiting')

    const poll = async () => {
      try {
        const res = await fetch(
          `${WEB_APP_URL}/api/cli/session?state=${state}`,
        )

        if (res.status === 200) {
          const data = await res.json()
          if (data.token) {
            // Save token
            const gitRoot = await findGitRoot()
            const { config: configPath } = await pwdKyoto(gitRoot)

            let currentConfig = {}
            try {
              currentConfig = await getConfig()
            } catch {
              // Ignore error if config doesn't exist or is invalid,
              // we will overwrite/merge what we can.
              // However, updateConfigJson expects full config structure if we pass it,
              // or it merges.
              // Actually updateConfigJson merges if we pass a config object.
              // But if getConfig fails, we might lose existing valid parts if we are not careful?
              // updateConfigJson reads the file if `config` arg is missing.
              // If we pass `config` arg, it USES it.
              // So we should try to read raw json if getConfig fails validation.
            }

            // We need to read the raw file to avoid losing data if validation fails
            // but we want to update auth.
            // updateConfigJson: if we pass `config`, it uses it as the base.
            // Wait, updateConfigJson implementation:
            // let configToWrite = config ?? {}
            // if (!config) { read file ... }
            // so if we pass config, it completely REPLACES the file content with what we pass (plus latest).
            // So we MUST read existing content first.
            // I'll re-read the file manually here to be safe, or assume getConfig works.
            // If getConfig fails, it means config is invalid.
            // Let's rely on getConfig working for now, as `setup` should be run.
            // Or better: read file manually.
          }

          // Re-reading logic to be safe
          const fs = await import('node:fs/promises')
          let existingConfig = {}
          try {
            const content = await fs.readFile(configPath, 'utf-8')
            existingConfig = JSON.parse(content)
          } catch {
            // ignore
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newConfig: any = {
            ...existingConfig,
            auth: {
              sessionToken: data.token,
            },
          }

          await updateConfigJson(configPath, null, null, newConfig)

          setStatus('success')
          return true // done
        }
      } catch {
        // Ignore network errors while polling
        return false
      }
      return false
    }

    const interval = setInterval(async () => {
      const done = await poll()
      if (done) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state, loginUrl])

  if (status === 'success') {
    return (
      <Box flexDirection="column">
        <Text color="green">✔ Logged in successfully!</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Please visit the following URL to log in:</Text>
      <Text color="cyan">{loginUrl}</Text>
      <Box>
        <Text color="yellow">
          <Spinner type="dots" /> Waiting for authentication...
        </Text>
      </Box>
      {error && <Text color="red">{error}</Text>}
    </Box>
  )
}
