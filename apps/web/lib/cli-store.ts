
// In-memory store for CLI login sessions
// This is used to pass the session token from the web app (server-side) to the CLI
// Maps state (UUID) -> session token
export const cliSessionStore = new Map<string, string>()

// Clean up old entries periodically (optional, but good practice)
// For this simple implementation, we won't add complex cleanup logic
// but in a real app you'd want TTL.
