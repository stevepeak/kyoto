import { execa } from 'execa'

export async function openBrowser(args: { url: string }): Promise<void> {
  const { url } = args
  const platform = process.platform

  const candidates: { cmd: string; args: string[] }[] = []
  if (platform === 'darwin') {
    candidates.push({ cmd: 'open', args: [url] })
  } else if (platform === 'win32') {
    candidates.push({ cmd: 'cmd', args: ['/c', 'start', '', url] })
  } else {
    candidates.push({ cmd: 'xdg-open', args: [url] })
  }

  let lastError: unknown = null
  for (const c of candidates) {
    try {
      await execa(c.cmd, c.args)
      return
    } catch (e) {
      lastError = e
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to open browser')
}
