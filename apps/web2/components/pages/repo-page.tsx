import { type Owner, type Repo } from '@app/db2'
import Link from 'next/link'

interface RepoPageProps {
  owner: Owner
  repo: Repo
}

export function RepoPage(props: RepoPageProps) {
  const { owner, repo } = props

  return (
    <div className="container mx-auto min-h-screen py-12">
      <div className="space-y-8">
        <nav className="text-sm text-muted-foreground">
          <Link href="/~" className="hover:text-foreground">
            Organizations
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/~/${owner.login}`} className="hover:text-foreground">
            {owner.name ?? owner.login}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{repo.name}</span>
        </nav>

        <div className="space-y-2">
          <h1 className="font-cormorant text-4xl font-semibold">{repo.name}</h1>
          {repo.description && (
            <p className="text-muted-foreground">{repo.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            {repo.private && (
              <span className="rounded-full border px-3 py-1">Private</span>
            )}
            {repo.defaultBranch && (
              <span className="text-muted-foreground">
                Default branch: {repo.defaultBranch}
              </span>
            )}
            {repo.htmlUrl && (
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on GitHub
              </a>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <p className="text-center text-muted-foreground">
            Repository page content will go here. This could include stories,
            runs, and other repository-specific information.
          </p>
        </div>
      </div>
    </div>
  )
}
