import Image from 'next/image'
import Link from 'next/link'

import { LoginButton } from '@/components/auth/login-button'
import { Button } from '@/components/ui/button'

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/kyoto-logo.png"
              alt="Kyoto"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
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
