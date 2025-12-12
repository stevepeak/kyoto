import { readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

async function restorePackageJson(): Promise<void> {
  const scriptFilename = fileURLToPath(import.meta.url)
  const scriptDirname = dirname(scriptFilename)

  const cliDir = join(scriptDirname, '..')
  const cliPackageJsonPath = join(cliDir, 'package.json')
  const backupPath = join(cliDir, 'package.json.__prepack_backup__')

  const backup = await readFile(backupPath, 'utf8')
  await writeFile(cliPackageJsonPath, backup, 'utf8')
  await rm(backupPath)
}

await restorePackageJson()
