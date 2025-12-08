import Link from 'next/link'

import { LoginButton } from '@/components/auth/login-button'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { Button } from '@/components/ui/button'

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <h1 className="font-cormorant text-3xl font-semibold tracking-tight hover:opacity-80 transition-opacity">
              Kyoto
            </h1>
          </Link>
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <a
              href="https://docs.usekyoto.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
          </Button>
          <LoginButton />
        </div>
      </div>
    </nav>
  )
}
