# Supabase Client Architecture

This document explains the standardized Supabase client structure used in JobHound. Following these guidelines is essential to ensure proper authentication and permissions.

## Client Types

We provide four distinct Supabase client types, each designed for specific use cases:

1. **Browser Client** (for client components)
   - Import from: `@/app/utils/supabase`
   - Used in: All client components (`'use client'` directive)
   - Features: Maintains user session in the browser
   - Example: `import { supabase } from '@/app/utils/supabase'`

2. **Server Component Client** (with cookie handling)
   - Import from: `@/supabase/server`
   - Used in: Server components, API routes, route handlers
   - Features: Properly handles cookies for user authentication
   - Example: `import { createClient } from '@/supabase/server'`

3. **Server Client** (no cookie handling)
   - Import from: `@/lib/supabase/client`
   - Used in: Background processes, edge functions
   - Features: Basic server-side client with anonymous role
   - Example: `import { createServerClient } from '@/lib/supabase/client'`

## File Structure

Our Supabase client utilities are organized as follows:

- `/lib/supabase/client.ts` - Central client factory with core implementation
- `/supabase/server.ts` - Server component client with cookie handling
- `/supabase/middleware.ts` - Middleware for session handling
- `/app/utils/supabase.ts` - Pre-instantiated browser client and helpers for client components

## Authentication Roles and RLS

Depending on which client you use, different PostgreSQL roles will be used:

1. **Browser Client & Server Component Client**: Uses the `authenticated` role when the user is logged in, and the `anon` role when not logged in.

2. **Service Role Client**: Uses the `service_role` that bypasses Row Level Security (RLS) policies.

## Common Issues and Troubleshooting

If you're experiencing permission issues:

1. Ensure you're using the correct client for your context:
   - Client components → Browser client
   - Server components → Server component client
   - Admin operations → Service role client (server-side only)

2. Check that your RLS policies are correctly configured in Supabase

3. Verify that the user has the necessary permissions for the operation

4. For server components, ensure the client has access to cookies

## Examples

### Client Component Example
```tsx
'use client';
import { supabase } from '@/app/utils/supabase';

export default function ClientComponent() {
  const fetchData = async () => {
    const { data } = await supabase.from('table').select('*');
    // Handle data
  };
}
```

### Server Component Example
```tsx
import { createClient } from '@/supabase/server';

export default async function ServerComponent() {
  const supabase = await createClient();
  const { data } = await supabase.from('table').select('*');
  // Handle data
}
```