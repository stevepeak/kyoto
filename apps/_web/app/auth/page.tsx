import { SignIn } from '@/components/features/auth/sign-in'

// Auth page can be statically generated
export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

export default function AuthPage() {
  return <SignIn />
}
