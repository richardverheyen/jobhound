# Set Temporary Session Edge Function

This Edge Function is used to set the temporary session ID for Row Level Security (RLS) policies in the database.

## Deployment

To deploy this Edge Function, run the following command:

```bash
supabase functions deploy set-temporary-session
```

## Usage

The function expects a JSON payload with a `session_id` field:

```json
{
  "session_id": "your-temporary-session-id"
}
```

## TypeScript and Linting

This Edge Function uses Deno, which has a different environment than Node.js. The TypeScript errors in your IDE are expected and can be ignored, as they will not affect the function's operation when deployed to Supabase.

The `deno.json` and `deno.d.ts` files are included to help with development, but they are not required for deployment.
