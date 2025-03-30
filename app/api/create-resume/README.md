# Resume Creation API

This API endpoint handles the creation of resume records in the database and performs several asynchronous operations:

1. Text extraction from the PDF resume
2. Thumbnail generation for the resume preview

## API Flow

1. Client uploads a PDF file to Supabase storage in the 'resumes' bucket
2. Client calls this API with file metadata
3. API creates a resume record in the database
4. API asynchronously:
   - Extracts text content from the PDF using Google's Gemini AI
   - Generates a thumbnail image of the first page of the PDF
   - Uploads the thumbnail to the 'thumbnails' bucket
   - Updates the resume record with extracted text and thumbnail information

## Thumbnails

Thumbnails are generated using the pdf2pic library which converts the first page of a PDF to a WebP image with the following specifications:

- Format: WebP (for optimal quality and file size)
- Dimensions: 1000px width, 562px height (16:9 aspect ratio)
- Quality: 90%
- Density: 300dpi (for sharp text in PDF previews)

The thumbnails are stored in a separate 'thumbnails' Supabase storage bucket and referenced in the resume record with:

- `thumbnail_path`: Path to the thumbnail in the storage bucket
- `thumbnail_url`: Signed URL for accessing the thumbnail (expires after 1 hour)

## Technical Requirements

This API requires:

- Google AI API key for text extraction
- Supabase service role key for storage operations
- pdf2pic library and its dependencies for thumbnail generation

## Request Format

```typescript
{
  filename: string;       // Original filename
  name: string;           // Display name for the resume
  filePath: string;       // Path in Supabase storage
  fileSize: number;       // Size in bytes
  fileUrl: string;        // Optional pre-generated signed URL
  setAsDefault?: boolean; // Whether to set as default resume
  fileBase64?: string;    // Optional base64 PDF content
}
```

## Response Format

```typescript
{
  success: true,
  resume_id: "uuid",
  resume: {
    id: "uuid",
    user_id: "uuid",
    filename: "Resume.pdf",
    file_path: "path/in/storage",
    file_url: "signed-url",
    file_size: 123456,
    mime_type: "application/pdf",
    raw_text: "Extracting text...", // Initially, until extraction completes
    thumbnail_path: null,           // Initially null, until generation completes
    thumbnail_url: null,            // Initially null, until generation completes
    created_at: "timestamp",
    updated_at: "timestamp",
    is_default: true
  },
  message: "Resume created. Text extraction and thumbnail generation in progress."
}
```

The client should periodically check for updates to the resume record to get the extracted text and thumbnail URL once processing is complete.

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

This endpoint is called by the CreateResumeModal component after uploading a resume file to Supabase storage. The component will receive an immediate response and display a success message to the user, while the text extraction and thumbnail generation continue in the background. 