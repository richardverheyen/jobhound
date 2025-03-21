# Local Supabase Development

This guide explains how to set up and use a locally hosted Supabase instance for development.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) installed
- Docker installed and running
- Node.js (14.x or higher)

## Quick Start

To start developing with a local Supabase instance:

```bash
npm run supabase:dev
```

This single command will:
- Set up the necessary environment variables in `.env.local`
- Start a local Supabase instance using the CLI
- Start the Next.js development server

## Access Your Local Supabase

When running locally, you can access:
- Supabase Dashboard: http://localhost:54323/project/default
- Supabase API: http://localhost:54321

## Useful Commands

- Start Supabase only: `npm run supabase:start`
- Stop Supabase: `npm run supabase:stop`
- Check Supabase status: `npm run supabase:status`
- Apply migrations: `npm run supabase:migrate`

## Environment Variables

Local Supabase development automatically sets these variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Working with Migrations

Migrations are automatically applied when starting with `npm run supabase:dev`.

To manually apply migrations to a running Supabase instance:

```bash
npm run supabase:migrate
```

This will reset the database and apply all migrations in the `supabase/migrations` folder.

## Troubleshooting

- If you encounter Docker permission issues, make sure Docker is running with the correct permissions
- To completely reset your local Supabase instance:
  ```bash
  npm run supabase:stop
  supabase db reset
  npm run supabase:start
  ``` 