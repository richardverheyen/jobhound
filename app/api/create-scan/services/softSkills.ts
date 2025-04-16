import { GenerativeModel } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { FieldDefinition, ResumeAnalysisResponse } from '../types';
import { createSystemPrompt, processAIResponse } from '../utils';

/**
 * Analyze resume soft skills
 */
export async function analyzeSoftSkills(
  model: GenerativeModel,
  fields: FieldDefinition[],
  resumeText: string,
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: any;
    raw_job_text: string;
    soft_skills: string[] | null;
  }
): Promise<ResumeAnalysisResponse> {
  // Find the soft skills field template
  const softSkillsTemplate = fields.find(field => field.id === 'softSkills');
  
  if (!softSkillsTemplate) {
    throw new Error('Soft skills field template not found');
  }
  
  // Create system prompt specific for soft skills
  const systemPrompt = `
# System Instructions for Resume Analysis - SOFT SKILLS Category

You are an expert resume analyzer specializing in soft skills assessment. Your task is to evaluate how well the candidate's resume demonstrates the soft skills required for this job.

## Processing Instructions:

1. For each soft skill listed in the job requirements, create a detailed analysis following the provided response structure.

2. Set the skill name as it appears in the job requirements, and use a slug version for the ID (lowercase, hyphenated).

3. For each skill:
   - Set 'exactMatchInResume' to true only if the exact skill name appears in the resume
   - Set 'synonymMatchInResume' to true only if any synonym appears
   - Set 'relatedTermMatchInResume' to true if there are behavioral examples or accomplishments that strongly demonstrate this skill
   - Include only synonyms that actually appear in the resume
   - Include related terms or phrases that demonstrate the skill
   - Set 'exactMatchCount' to the number of times the exact skill name appears

4. Set confidence score (0-1) based on how strongly the resume demonstrates this skill:
   - 0.9-1.0: Skill is explicitly named and multiple achievements clearly demonstrate mastery
   - 0.7-0.8: Strong evidence through achievements and examples, even if not explicitly named
   - 0.4-0.6: Moderate evidence through some examples or mentions
   - 0.1-0.3: Limited or implicit evidence
   - 0: No evidence found

5. In the explanation, cite specific examples from the resume showing where and how the skill is demonstrated, whether explicitly named or implied through accomplishments.

## Key Abbreviation Dictionary:
For token efficiency, use these abbreviated keys in your response:

\`\`\`
Key mapping:
- id: id (skill slug)
- p: parentFieldId (always "softSkills")
- l: label (skill name)
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

Return a JSON array with one object for each soft skill:
\`\`\`json
[
  {
    "id": "skill-name-slug",
    "p": "softSkills",
    "l": "Skill Name",
    "syn": ["Alternative Name", "Related Descriptor"],
    "rt": ["Related Phrase", "Behavioral Example"],
    "em": true,
    "sm": false,
    "rm": true,
    "emc": 2,
    "c": 0.75,
    "e": "Detailed explanation with examples from the resume"
  }
]
\`\`\`
`;
  
  // Prepare the list of soft skills from the job data
  const softSkills = jobData.soft_skills || [];
  
  // If no soft skills are found in the job, default to LLM extraction
  const userPrompt = softSkills.length > 0
    ? `Analyze this resume text for the following soft skills required for this job:
${softSkills.map(skill => `- ${skill}`).join('\n')}

Job Title: ${jobData.title}
Company: ${jobData.company}
Job Description: ${jobData.raw_job_text}

RESUME TEXT:
${resumeText}

Use the field template structure below for your analysis:
${JSON.stringify(softSkillsTemplate.fieldResponse, null, 2)}`
    : `Analyze this resume text against the following job posting:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.raw_job_text}

RESUME TEXT:
${resumeText}

First, identify the key soft skills required for this job by analyzing the job description.
Then, evaluate how well the resume demonstrates each of these soft skills.

Use the field template structure below for your analysis:
${JSON.stringify(softSkillsTemplate.fieldResponse, null, 2)}`;

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
            p: { type: SchemaType.STRING },
            l: { type: SchemaType.STRING },
            syn: { 
              type: SchemaType.ARRAY, 
              items: { type: SchemaType.STRING }
            },
            rt: { 
              type: SchemaType.ARRAY, 
              items: { type: SchemaType.STRING }
            },
            em: { type: SchemaType.BOOLEAN },
            sm: { type: SchemaType.BOOLEAN },
            rm: { type: SchemaType.BOOLEAN },
            emc: { type: SchemaType.NUMBER },
            c: { type: SchemaType.NUMBER },
            e: { type: SchemaType.STRING }
          },
          required: ["id", "p", "l", "syn", "rt", "em", "sm", "rm", "emc", "c", "e"]
        }
      }
    },
  });

  console.log("softSkills systemPrompt", systemPrompt)
  console.log("softSkills userPrompt", userPrompt)
  // Parse the response
  const responseText = result.response.text();
  return processAIResponse(responseText);
} 