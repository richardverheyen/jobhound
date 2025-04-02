import { GenerativeModel } from '@google/generative-ai';
import { FieldDefinition, ResumeAnalysisResponse } from '../types';
import { createSystemPrompt, filterFieldsByCategory, processAIResponse } from '../utils';

/**
 * Analyze resume searchability
 */
export async function analyzeSearchability(
  model: GenerativeModel,
  fields: FieldDefinition[],
  resumeData: {
    id: any;
    filename: any;
    file_url: any;
    file_path: any;
    raw_text: any;
  }, 
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
  // Filter fields for searchability category
  const searchabilityFields = filterFieldsByCategory(fields, 'searchability');
  
  // Create system prompt
  const systemPrompt = createSystemPrompt('searchability');
  
  // Create user prompt
  const userPrompt = `Analyze this resume text for searchability against the following job posting:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.raw_job_text}

JOB_METADATA:
${JSON.stringify(jobData, null, 2)}

RESUME_METADATA:
filename : ${resumeData.filename}
file_url : ${resumeData.file_url}
file_path : ${resumeData.file_path}

RESUME TEXT:
${resumeData.raw_text}

Use these field definitions for your analysis:
${JSON.stringify(searchabilityFields, null, 2)}`;

  // Call the model
  const result = await model.generateContent({
    contents: [
      { 
        role: "user", 
        parts: [
          { text: `${systemPrompt}\n\n${userPrompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8000,
      responseMimeType: "application/json",
    },
  });

  console.log("searchability systemPrompt", systemPrompt)
  console.log("searchability userPrompt", userPrompt)

  // Parse the response
  const responseText = result.response.text();
  return processAIResponse(responseText);
} 