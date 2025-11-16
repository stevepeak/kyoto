# Setup Guide

This guide will help you get Kyoto running locally.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- PNPM
- A GitHub OAuth application
- A GitHub App (for repository access)
- An OpenAI-compatible API key
- A Trigger.dev account

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/stevepeak/kyoto.git
   cd kyoto
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in `apps/web` and add the following variables:

   ```env
   # Generate a secret with `openssl rand -base64 32`
   AUTH_SECRET="your_auth_secret"

   # From your GitHub OAuth application
   GITHUB_CLIENT_ID="your_github_client_id"
   GITHUB_CLIENT_SECRET="your_github_client_secret"

   # From your GitHub App (for repository access)
   GITHUB_APP_ID="your_github_app_id"
   GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   GITHUB_APP_SLUG="your_github_app_slug"

   # Your local PostgreSQL connection string
   DATABASE_URL="postgres://user:password@localhost:5432/kyoto"

   # OpenAI-compatible API key (for AI features)
   OPENAI_API_KEY="your_openai_api_key"

   # Trigger.dev secret key (for background jobs)
   TRIGGER_SECRET_KEY="your_trigger_secret_key"
   ```

4. **Set up the database:**

   Make sure you have a PostgreSQL server running. Then, run the migrations:

   ```bash
   DATABASE_URL="postgres://user:password@localhost:5432/kyoto" pnpm --filter @app/db db:migrate
   ```

5. **Run the development server:**

   ```bash
   pnpm dev
   ```

   The web application will be available at `http://localhost:3001`.

## Project Structure

This monorepo includes:

- **`apps/web`**: An [Astro](https://astro.build/) application for the frontend.
- **`apps/trigger`**: [Trigger.dev](https://trigger.dev/) background jobs and automation. Manages external webhook processing, scheduled tasks, and integration with monitoring tools (e.g., Sentry).
- **`packages/api`**: A [tRPC](https://trpc.io/) API for type-safe client-server communication.
- **`packages/db`**: Database schemas, migrations, and query utilities using [Kysely](https://kysely.dev/).
- **`packages/utils`**: Shared utilities used across the monorepo.
- **`packages/schemas`**: Shared Zod schemas for validation.
- **`packages/agents`**: AI agent implementations for story decomposition and evaluation.
- **`packages/cache`**: Evidence caching system for efficient test runs.

## Development Commands

- `pnpm build`: Build all apps and packages.
- `pnpm lint`: Lint all code.
- `pnpm fix`: Auto-fix linting issues.
- `pnpm typecheck`: Run TypeScript to check for type errors.
- `pnpm test`: Run tests.
- `pnpm dev`: Start development servers.
- `pnpm ci`: Run full CI checks (lint, typecheck, test, build).

## Tech Stack

- **Frontend**: [Astro](https://astro.build/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Backend**: [tRPC](https://trpc.io/), [Kysely](https://kysely.dev/)
- **Authentication**: [better-auth](https://github.com/better-auth/better-auth)
- **Background Jobs**: [Trigger.dev](https://trigger.dev/)
- **Tooling**: [Turborepo](https://turbo.build/repo), [PNPM](https://pnpm.io/), [TypeScript](https://www.typescriptlang.org/), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
