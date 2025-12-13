import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const RootPackageJsonSchema = z.object({
  workspaces: z.object({
    catalog: z.record(z.string().min(1), z.string().min(1)),
  }),
})

const CliPackageJsonSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    dependencies: z.record(z.string().min(1), z.string().min(1)).optional(),
    devDependencies: z.record(z.string().min(1), z.string().min(1)).optional(),
  })
  .passthrough()

function rewriteDeps(args: {
  deps: Record<string, string> | undefined
  catalog: Record<string, string>
}): Record<string, string> | undefined {
  if (!args.deps) return undefined

  const out: Record<string, string> = {}
  for (const [name, spec] of Object.entries(args.deps)) {
    if (spec === 'catalog:') {
      const version = args.catalog[name]
      if (!version) {
        throw new Error(`Missing catalog version for dependency: ${name}`)
      }
      out[name] = version
      continue
    }

    if (spec.startsWith('workspace:')) {
      // Workspace deps cannot be resolved for end users. The CLI build bundles internal
      // packages so we strip these for the published tarball.
      continue
    }

    out[name] = spec
  }

  return out
}

async function prepareNpmPackage(): Promise<void> {
  const scriptFilename = fileURLToPath(import.meta.url)
  const scriptDirname = dirname(scriptFilename)

  const cliDir = join(scriptDirname, '..')
  const cliPackageJsonPath = join(cliDir, 'package.json')
  const rootPackageJsonPath = join(cliDir, '../..', 'package.json')

  const [rawCliPackageJson, rawRootPackageJson] = await Promise.all([
    readFile(cliPackageJsonPath, 'utf8'),
    readFile(rootPackageJsonPath, 'utf8'),
  ])

  // Zod-validated JSON parsing (do not trust JSON shape at runtime)
  const rootPackageJson = RootPackageJsonSchema.parse(
    JSON.parse(rawRootPackageJson),
  )
  const cliPackageJson = CliPackageJsonSchema.parse(
    JSON.parse(rawCliPackageJson),
  )

  const distCliPath = join(cliDir, 'dist', 'cli.js')
  const distCli = await readFile(distCliPath, 'utf8')
  const hasWorkspaceImports =
    /\bfrom\s+["']@app\//.test(distCli) ||
    /\bimport\s+["']@app\//.test(distCli) ||
    /\brequire\(\s*["']@app\//.test(distCli)

  if (hasWorkspaceImports) {
    throw new Error(
      'Bundled CLI output still references "@app/*". Build must bundle internal workspace packages.',
    )
  }

  const catalog = rootPackageJson.workspaces.catalog

  const publishedPackageJson = {
    ...cliPackageJson,
    bin: {
      kyoto: './bin/packed.js',
    },
    dependencies: rewriteDeps({ deps: cliPackageJson.dependencies, catalog }),
    devDependencies: rewriteDeps({
      deps: cliPackageJson.devDependencies,
      catalog,
    }),
  }

  const serialized = `${JSON.stringify(publishedPackageJson, null, 2)}\n`
  if (serialized.includes('catalog:') || serialized.includes('workspace:')) {
    throw new Error(
      'prepare-npm-package.ts: publish package.json still contains "catalog:" or "workspace:" specs',
    )
  }

  await writeFile(cliPackageJsonPath, serialized, 'utf8')
}

await prepareNpmPackage()
