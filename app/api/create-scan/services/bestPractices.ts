import { GenerativeModel } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { FieldDefinition, ResumeAnalysisResponse } from '../types';
import { createSystemPrompt, filterFieldsByCategory, processAIResponse } from '../utils';

/**
 * Analyze resume best practices
 */
export async function analyzeBestPractices(
  model: GenerativeModel,
  fields: FieldDefinition[],
  resumeBase64: string,
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: any;
    raw_job_text: string;
    hard_skills: string[] | null;
    soft_skills: string[] | null;
  }
): Promise<ResumeAnalysisResponse> {
  // Filter fields for bestPractices category
  const bestPracticesFields = filterFieldsByCategory(fields, 'bestPractices');
  
  // Create system prompt
  const systemPrompt = createSystemPrompt('bestPractices');
  
  // Create user prompt
  const userPrompt = `Analyze this resume for best practices adherence against the following job posting:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.raw_job_text}

Use these field definitions for your analysis:
${JSON.stringify(bestPracticesFields, null, 2)}`;

  // Call the model
  const result = await model.generateContent({
    contents: [
      { 
        role: "user", 
        parts: [
          { text: `${systemPrompt}\n\n${userPrompt}` },
          { 
            inlineData: {
              mimeType: "application/pdf",
              data: resumeBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.05,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8000,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            c: { type: SchemaType.NUMBER },
            e: { type: SchemaType.STRING },
            v: { type: SchemaType.BOOLEAN }
          },
          required: ["id", "c", "e", "v"]
        }
      }
    },
  });

  console.log("bestPractices systemPrompt", systemPrompt)
  console.log("bestPractices userPrompt", userPrompt)

  // Parse the response
  const responseText = result.response.text();
  return processAIResponse(responseText);
} 