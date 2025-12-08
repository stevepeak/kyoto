# Web2 - Next.js with Drizzle ORM & Better Auth

A simple Next.js application with Drizzle ORM for database management and Better Auth for GitHub OAuth authentication.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Drizzle ORM** - Type-safe database ORM
- **Better Auth** - Modern authentication with GitHub OAuth
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Beautiful UI components

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database (PostgreSQL)
# Get this from Neon, Supabase, or any PostgreSQL provider
DATABASE_URL="postgresql://user:password@host:5432/database"

# App URL (for auth redirects)
NEXT_PUBLIC_APP_URL="http://localhost:3002"

# Better Auth
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET="your-secret-here"
BETTER_AUTH_URL="http://localhost:3002"

# GitHub OAuth
# Get these from: https://github.com/settings/developers
# Authorization callback URL: http://localhost:3002/api/auth/callback/github
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

### 3. GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Web2 (or your choice)
   - **Homepage URL**: `http://localhost:3002`
   - **Authorization callback URL**: `http://localhost:3002/api/auth/callback/github`
4. Copy the Client ID and generate a Client Secret
5. Add them to your `.env.local` file

### 4. Database Setup

```bash
# Generate migration files
bun drizzle-kit generate

# Push schema to database
bun drizzle-kit push

# Or run migrations manually
bun drizzle-kit migrate
```

### 5. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

## Project Structure

```
apps/web2/
├── app/
│   ├── api/
│   │   └── auth/[...all]/     # Auth API routes
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Homepage
│   └── globals.css             # Global styles
├── components/
│   ├── auth/
│   │   └── user-button.tsx     # Login/user display component
│   └── ui/                     # shadcn components
├── lib/
│   ├── auth.ts                 # Better Auth config
│   ├── auth-client.ts          # Client-side auth utilities
│   ├── db/
│   │   ├── schema.ts           # Database schema
│   │   └── index.ts            # Database connection
│   └── utils.ts                # Utility functions
└── drizzle.config.ts           # Drizzle ORM config
```

## Available Scripts

- `bun run dev` - Start development server on port 3002
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint and Prettier checks
- `bun run fix` - Auto-fix linting issues
- `bun run typecheck` - Run TypeScript type checking

## Features

- ✅ GitHub OAuth authentication
- ✅ Session management
- ✅ Type-safe database with Drizzle ORM
- ✅ Automatic database migrations
- ✅ Beautiful UI with shadcn components
- ✅ Responsive design with Tailwind CSS

## Database Schema

The app uses the following tables (managed by Better Auth):

- `user` - User accounts
- `session` - User sessions
- `account` - OAuth account connections
- `verification` - Email verification tokens

You can extend the schema by adding more tables in `lib/db/schema.ts`.
