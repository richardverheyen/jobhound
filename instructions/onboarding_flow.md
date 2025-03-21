# Security Considerations for the Onboarding Flow

Based on the new implementation using Supabase Auth's anonymous users, here are the security measures that make this onboarding flow secure and resistant to abuse:

## 1. Secure User Management

The new onboarding flow uses Supabase Auth's built-in anonymous authentication:

- **Native Supabase Auth integration**: Leverages Supabase's battle-tested authentication system instead of custom session management.
- **Limited anonymous user lifetime**: Each anonymous user has a configurable expiration time (default 24 hours, maximum 72 hours).
- **User status tracking**: Anonymous users are clearly marked with `is_anonymous=true` flag and tracked with `anonymous_expires_at` timestamp.

## 2. Row-Level Security (RLS) Policies

The RLS policies ensure data can only be accessed by the appropriate users:

- All database operations use Supabase Auth's built-in `auth.uid()` function to verify user identity.
- Jobs, resumes, and job scans created during onboarding belong directly to the anonymous user.
- When converted to a registered user, all data remains accessible to the same user ID.
- No custom session context is needed as we rely on Supabase Auth for authentication.

## 3. Rate Limiting and Abuse Prevention

- Supabase Auth has built-in protections against rapid creation of multiple users.
- Additional application-level rate limiting can be implemented in Edge Functions.
- Scheduled cleanup of expired anonymous users prevents accumulation of abandoned data.

## 4. Secure User Conversion

When a user completes onboarding and creates an account:

- The anonymous user is converted to a registered user in-place.
- All data ownership is preserved without the need for complex migration.
- The user's authentication status is properly updated in both Auth and the database.

## 5. Validation Throughout the Flow

Multiple validation steps are implemented:

- Email validation during permanent account creation.
- Anonymous user expiration checks before allowing access.
- Auth token validation through Supabase's built-in mechanisms.

## 6. Automatic Cleanup

A function to automatically clean up expired anonymous users prevents data accumulation:

- `cleanup_expired_anonymous_users()` removes all data associated with expired anonymous users.
- This function can be scheduled to run periodically via Supabase's scheduled functions.

## Implementation Notes

### Database Changes:

- Added `is_anonymous` and `anonymous_expires_at` fields to the users table.
- Removed the separate `onboarding_sessions` table and related foreign keys.
- Created functions for anonymous user creation, conversion, and cleanup.

### Authentication Flow:

- Use `supabase.auth.signUp()` with anonymous email/password to create temporary users.
- Apply RLS based on the authenticated user ID from Supabase Auth.
- Convert anonymous users to registered users when they complete signup.

### Edge Functions:

- No need for `set-temporary-session` or custom session handling.
- Edge functions can use the standard Supabase Auth context.

## Key Benefits of This Approach

- **Simplified Security Model**: Uses Supabase Auth's built-in mechanisms instead of custom sessions.
- **Improved User Experience**: Seamless onboarding without requiring account creation upfront.
- **Reduced Complexity**: Eliminates custom session management code and related security concerns.
- **Better Data Integrity**: All data is properly associated with users from the beginning.
- **Increased Reliability**: Leverages Supabase's thoroughly tested authentication system.

This implementation provides a secure onboarding flow that balances user experience with security, ensuring that your system can't be abused by malicious actors while still allowing legitimate users to experience the application before committing to account creation.