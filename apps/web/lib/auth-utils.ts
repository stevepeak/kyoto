interface UserWithLogin {
  login: string
  name: string
  email: string
  image?: string | null
}

function hasLogin(user: unknown): user is UserWithLogin {
  return (
    typeof user === 'object' &&
    user !== null &&
    'login' in user &&
    typeof (user as { login: unknown }).login === 'string'
  )
}

export function getUserLogin(user: unknown): string {
  if (hasLogin(user)) {
    return user.login
  }

  if (
    typeof user === 'object' &&
    user !== null &&
    'email' in user &&
    typeof (user as { email: unknown }).email === 'string'
  ) {
    return (user as { email: string }).email.split('@')[0] ?? 'user'
  }

  return 'user'
}
