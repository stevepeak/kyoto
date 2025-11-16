# ⛩️ Kyoto

> ⛩️ Kyoto - Intent testing

# Why Kyoto?

In the age of AI many hackers are vibe coding and not writing tests. We don't blame them.
Instead, let's write user stories and let AI review the code to ensure the functionality
**may** work as expected.

# Development

## What's inside?

This monorepo includes:

- `apps/web`: An [Astro](https://astro.build/) application for the frontend.
- `apps/trigger`: [Trigger.dev](https://trigger.dev/) background jobs and automation. Manages external webhook processing, scheduled tasks, and integration with monitoring tools (e.g., Sentry).
- `packages/api`: A [tRPC](https://trpc.io/) API for type-safe client-server communication.
- `packages/db`: Database schemas, migrations, and query utilities using [Kysely](https://kysely.dev/).
- `packages/utils`: Shared utilities used across the monorepo.
- **Authentication**: Example implementation using [better-auth](https://github.com/better-auth/better-auth) with GitHub as an OAuth provider.
- **UI**: Basic UI setup with [Tailwind CSS](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/).
- **Tooling**:
  - [Turborepo](https://turbo.build/repo) for high-performance builds.
  - [Bun](https://bun.sh/) for fast package management and runtime.
  - [TypeScript](https://www.typescriptlang.org/) for static typing.
  - [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) for code quality.

## Getting Started

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/stevepeak/kyoto.git
    cd kyoto
    ```

2.  **Install dependencies:**

    ```bash
    bun install
    ```

3.  **Set up environment variables:**

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

    # Trigger.dev secret key (for background jobs)
    TRIGGER_SECRET_KEY="your_trigger_secret_key"
    ```

4.  **Set up the database:**

    Make sure you have a PostgreSQL server running. Then, run the migrations:

    ```bash
    DATABASE_URL="postgres://user:password@localhost:5432/kyoto" bun --filter @app/db db:migrate
    ```

5.  **Run the development server:**

    ```bash
    bun dev
    ```

    The web application will be available at `http://localhost:3001`.

## Development

- `bun build`: Build all apps and packages.
- `bun lint`: Lint all code.
- `bun typecheck`: Run TypeScript to check for type errors.
- `bun test`: Run tests.

# Authors

- [@stevepeak](https://github.com/stevepeak)

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
