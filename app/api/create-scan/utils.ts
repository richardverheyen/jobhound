import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { FieldDefinition, ResumeAnalysisResponse } from './types';

/**
 * Initialize Google Generative AI client
 */
export function initGoogleAI(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
}

/**
 * Initialize Supabase client
 */
export function initSupabase(url: string, anonKey: string, authHeader: string) {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

/**
 * Initialize admin Supabase client
 */
export function initAdminSupabase(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Convert file to base64
 */
export async function fileToBase64(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

/**
 * Extract text from PDF using Google AI
 */
export async function extractTextFromPdf(file: Blob): Promise<string> {
  // Since we're already using Gemini for analysis, we'll also use it to extract text
  // This avoids adding another dependency just for text extraction
  
  // Convert file to base64
  const base64Data = await fileToBase64(file);
  
  // Initialize Google AI with environment variable
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  
  // Create a simple prompt to extract text
  const result = await model.generateContent({
    contents: [
      { 
        role: "user", 
        parts: [
          { text: "Extract all text from this resume PDF document. Return ONLY the extracted text with no additional commentary." },
          { 
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 32000,
    },
  });
  
  // Return the extracted text
  return result.response.text();
}

/**
 * Filter fields by category
 */
export function filterFieldsByCategory(fields: FieldDefinition[], category: string): FieldDefinition[] {
  return fields.filter(field => field.fieldContext.category === category);
}

/**
 * Process AI response text to extract JSON
 */
export function processAIResponse(responseText: string): any {
  // Extract JSON from the response if needed
  const jsonMatches = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                     responseText.match(/```([\s\S]*?)```/) ||
                     [null, responseText];
  
  const cleanJson = jsonMatches[1] || responseText;
  return JSON.parse(cleanJson);
}

/**
 * Create system prompt for each category
 */
export function createSystemPrompt(category: string): string {
  const basePrompt = `
# System Instructions for Resume Analysis - ${category.toUpperCase()} Category

You are an expert resume analyzer specialized in the ${category} category. Process each field according to its prompt and context.

## Processing Instructions:

1. Analyze each field in the provided definitions array, focusing only on the ${category} category.

2. For each field, carefully analyze the resume according to the prompt in the field's \`fieldContext.prompt\`.

3. Generate responses based on the field's \`type\`:

   - For fields with \`type: "one-to-one"\`: 
     Create a SINGLE response object matching the structure in \`fieldResponse\`.
   
   - For fields with \`type: "one-to-many"\`: 
     Create MULTIPLE response objects in an array, with each object following the structure in \`fieldResponse\`.
     Generate as many objects as are justified by the content found in the job description and requirements.
     Each object should represent a distinct item (like a specific skill) identified from the prompt.

4. Replace any template variables in the response (e.g., \`$\{skillNameSlug}\`, \`$\{skillName}\`) with appropriate values.

## Key Abbreviation Dictionary:
For token efficiency, use these abbreviated keys in your response:

\`\`\`
Key mapping:
- id: id (unchanged)
- p: parentFieldId
- l: label
- v: value
- syn: synonyms
- rt: relatedTerms
- em: exactMatchInResume
- sm: synonymMatchInResume
- rm: relatedTermMatchInResume
- emc: exactMatchCount
- c: confidence
- e: explanation
\`\`\`

## Response Format:

Return a JSON array of response objects.

## Important:
- Always maintain the original structure of each \`fieldResponse\` with the abbreviated keys
- For one-to-many fields, create as many objects as necessary - don't limit yourself to a fixed number
- Each response object should include the original field ID as a reference in the "p" property
- For one-to-many fields, each generated object should have a unique ID derived from the content (like "skill-python")
- Provide detailed and specific explanations
- Include all required properties from the corresponding \`fieldResponse\` structure
`;

  return basePrompt;
}

/**
 * Combine results from all categories
 */
export function combineResults(...categoryResults: ResumeAnalysisResponse[]): ResumeAnalysisResponse {
  return categoryResults.flat();
} 