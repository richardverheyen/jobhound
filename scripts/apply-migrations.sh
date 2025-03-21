#!/bin/bash

# This script applies migrations to the local Supabase instance

# Make sure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI is not installed. Please install it first:"
  echo "https://supabase.com/docs/guides/cli/getting-started"
  exit 1
fi

# Check if Supabase is running (improved check)
if ! supabase status | grep -q "API URL"; then
  echo "Supabase instance is not running. Starting it now..."
  supabase start
fi

# Run migrations
echo "Applying migrations to local Supabase instance..."
supabase db reset

echo "Migrations applied successfully!" 