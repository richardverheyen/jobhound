#!/bin/bash

# Script to run both integration and e2e tests
set -e

# Check if we should run the local supabase instance
if [ "$1" = "--with-supabase" ]; then
  echo "Starting local Supabase..."
  npm run supabase:start
  STOP_SUPABASE=true
fi

echo "Running integration tests..."
npx jest --config tests/integration/jest.config.js

echo "Running E2E tests with Playwright..."
npx playwright test

# If we started Supabase, stop it
if [ "$STOP_SUPABASE" = true ]; then
  echo "Stopping local Supabase..."
  npm run supabase:stop
fi

echo "All tests completed successfully!" 