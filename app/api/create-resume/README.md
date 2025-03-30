# Create Resume API

This API endpoint creates a new resume and asynchronously uses Google's Gemini API to extract text from the uploaded PDF file. The extracted text is stored in the database alongside the resume metadata.

## Functionality

1. Receives resume file information from the client
2. Creates the resume record immediately with a placeholder text
3. Returns a response to the client right away
4. Asynchronously processes text extraction in the background:
   - Downloads the file from Supabase storage if not provided directly
   - Uses Gemini Pro Vision model to extract text from the PDF
   - Updates the resume record with the extracted text
   - Handles any errors during the background process

## Request Format

```json
{
  "filename": "original-file-name.pdf",
  "name": "Resume Name for Display",
  "filePath": "user-id/filename.pdf",
  "fileSize": 12345,
  "fileUrl": "https://...",
  "setAsDefault": true,
  "fileBase64": "base64 encoded file content (optional)"
}
```

## Response Format

```json
{
  "success": true,
  "resume_id": "uuid",
  "resume": {
    "id": "uuid",
    "user_id": "uuid",
    "filename": "Resume Name",
    "file_path": "user-id/filename.pdf",
    "file_url": "https://...",
    "file_size": 12345,
    "mime_type": "application/pdf",
    "raw_text": "Extracting text...",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "is_default": true
  },
  "message": "Resume created. Text extraction in progress."
}
```

## Error Response

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## Authentication

The endpoint requires a valid Supabase authentication token in the Authorization header:

```
Authorization: Bearer <token>
```

## Required Environment Variables

- `GOOGLE_GENERATIVE_AI_API_KEY`: API key for Google Generative AI
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for background processing)

## Usage

This endpoint is called by the CreateResumeModal component after uploading a resume file to Supabase storage. The component will receive an immediate response and display a success message to the user, while the text extraction continues in the background. 