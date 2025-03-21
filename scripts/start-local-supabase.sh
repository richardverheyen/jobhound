#!/bin/bash

# This script starts a local Supabase instance using the CLI

# Make sure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI is not installed. Please install it first:"
  echo "https://supabase.com/docs/guides/cli/getting-started"
  exit 1
fi

# Create or update .env.local for local development
echo "Setting up environment variables for local development..."
cat > .env.local << EOL
# Local Supabase instance
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
EOL

# Start the Supabase services
echo "Starting Supabase services..."
supabase start

echo "-------------------------------------------"
echo "🚀 Local Supabase is running!"
echo "-------------------------------------------"
echo "📊 Supabase Dashboard: http://localhost:54323/project/default"
echo "🔌 Supabase API: http://localhost:54321"
echo "-------------------------------------------"
echo "Starting Next.js development server..."

# Start Next.js dev server
npm run dev 