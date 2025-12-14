import { createServer } from 'node:http'

import { CALLBACK_HTML } from './callback-html'

type LoginCallbackResult = {
  token: string
  login: string
}

type CallbackServer = {
  redirectUri: string
  waitForCallback: Promise<LoginCallbackResult>
  close: () => void
}

export async function startCallbackServer(args: {
  expectedState: string
}): Promise<CallbackServer> {
  const { expectedState } = args

  let resolveCallback: ((v: LoginCallbackResult) => void) | null = null
  let rejectCallback: ((e: unknown) => void) | null = null

  const waitForCallback = new Promise<LoginCallbackResult>(
    (resolve, reject) => {
      resolveCallback = resolve
      rejectCallback = reject
    },
  )

  const server = createServer((req, res) => {
    try {
      const host = req.headers.host ?? '127.0.0.1'
      const url = new URL(req.url ?? '/', `http://${host}`)
      if (url.pathname !== '/callback') {
        res.statusCode = 404
        res.end('Not found')
        return
      }

      const state = url.searchParams.get('state') ?? ''
      const token = url.searchParams.get('token') ?? ''
      const login = url.searchParams.get('login') ?? ''

      if (!token) {
        res.statusCode = 400
        res.end('Missing token')
        return
      }

      if (!login) {
        res.statusCode = 400
        res.end('Missing login')
        return
      }

      if (state !== expectedState) {
        res.statusCode = 400
        res.end('Invalid state')
        return
      }

      res.statusCode = 200
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(CALLBACK_HTML)

      server.close(() => resolveCallback?.({ token, login }))
    } catch (e) {
      try {
        res.statusCode = 500
        res.end('Internal error')
      } finally {
        server.close(() => rejectCallback?.(e))
      }
    }
  })

  const redirectUri = await new Promise<string>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() =>
          reject(new Error('Failed to bind local callback port')),
        )
        return
      }
      resolve(`http://127.0.0.1:${address.port}/callback`)
    })
  })

  const timeout = setTimeout(
    () => {
      server.close(() =>
        rejectCallback?.(new Error('Timed out waiting for login callback')),
      )
    },
    2 * 60 * 1000,
  )

  server.on('close', () => {
    clearTimeout(timeout)
  })

  return {
    redirectUri,
    waitForCallback,
    close: () => {
      server.close()
    },
  }
}
