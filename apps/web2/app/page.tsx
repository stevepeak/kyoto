import { UserButton } from '@/components/auth/user-button'

export default function HomePage() {
  return (
    <main className="container mx-auto min-h-screen py-12">
      <div className="flex flex-col items-center justify-center gap-8">
        <h1 className="font-cormorant text-8xl font-semibold tracking-tight md:text-9xl">
          Kyoto
        </h1>
        <UserButton />
      </div>
    </main>
  )
}
