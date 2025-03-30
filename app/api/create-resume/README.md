# Create Resume API

This API endpoint creates a new resume and uses Google's Gemini API to extract text from the uploaded PDF file. The extracted text is stored in the database alongside the resume metadata.

## Functionality

1. Receives resume file information from the client
2. Downloads the file from Supabase storage if not provided directly
3. Uses Gemini 2.0 Pro Vision model to extract text from the PDF
4. Stores the resume and extracted text in the database

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
    "raw_text": "Extracted text from the PDF...",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "is_default": true
  }
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

## Environment Variables Required

- `GOOGLE_GENERATIVE_AI_API_KEY`: API key for Google Generative AI
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Usage

This endpoint is called by the CreateResumeModal component after uploading a resume file to Supabase storage. 