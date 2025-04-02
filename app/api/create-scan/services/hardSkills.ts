import { GenerativeModel } from '@google/generative-ai';
import { FieldDefinition, ResumeAnalysisResponse } from '../types';
import { createSystemPrompt, processAIResponse } from '../utils';

/**
 * Analyze resume hard skills
 */
export async function analyzeHardSkills(
  model: GenerativeModel,
  fields: FieldDefinition[],
  resumeText: string,
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: any;
    raw_job_text: string;
    hard_skills: string[] | null;
  }
): Promise<ResumeAnalysisResponse> {
  // Find the hard skills field template
  const hardSkillsTemplate = fields.find(field => field.id === 'hardSkills');
  
  if (!hardSkillsTemplate) {
    throw new Error('Hard skills field template not found');
  }
  
  // Create system prompt specific for hard skills
  const systemPrompt = `
# System Instructions for Resume Analysis - HARD SKILLS Category

You are an expert resume analyzer specializing in technical skills assessment. Your task is to evaluate how well the candidate's resume matches the required hard skills for this job.

## Processing Instructions:

1. For each hard skill listed in the job requirements, create a detailed analysis following the provided response structure.

2. Set the skill name as it appears in the job requirements, and use a slug version for the ID (lowercase, hyphenated).

3. For each skill:
   - Set 'exactMatchInResume' to true only if the exact skill name appears in the resume
   - Set 'synonymMatchInResume' to true only if any synonym appears
   - Set 'relatedTermMatchInResume' to true if there are technologies or tools in the resume that strongly imply knowledge of this skill
   - Include only synonyms that actually appear in the resume
   - Include related terms that appear in or are implied by the resume content
   - Set 'exactMatchCount' to the number of times the exact skill name appears

4. Set confidence score (0-1) based on how strongly the resume demonstrates this skill
   - 0.9-1.0: Extensive experience clearly demonstrated with multiple mentions and examples
   - 0.7-0.8: Solid experience with clear examples or multiple mentions
   - 0.4-0.6: Some experience, mentioned but limited detail
   - 0.1-0.3: Minimal evidence or only implied through related skills
   - 0: No evidence found

5. In the explanation, cite specific examples from the resume showing where and how the skill or related terms appear.

## Key Abbreviation Dictionary:
For token efficiency, use these abbreviated keys in your response:

\`\`\`
Key mapping:
- id: id (skill slug)
- p: parentFieldId (always "hardSkills")
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

Return a JSON array with one object for each hard skill:
\`\`\`json
[
  {
    "id": "skill-name-slug",
    "p": "hardSkills",
    "l": "Skill Name",
    "syn": ["Alternative Name", "Abbreviation"],
    "rt": ["Related Tool", "Related Technology"],
    "em": true,
    "sm": false,
    "rm": true,
    "emc": 3,
    "c": 0.85,
    "e": "Detailed explanation with examples from the resume"
  }
]
\`\`\`
`;
  
  // Prepare the list of hard skills from the job data
  const hardSkills = jobData.hard_skills || [];
  
  // If no hard skills are found in the job, default to LLM extraction
  const userPrompt = hardSkills.length > 0
    ? `Analyze this resume text for the following hard skills required for this job:
${hardSkills.map(skill => `- ${skill}`).join('\n')}

Job Title: ${jobData.title}
Company: ${jobData.company}
Job Description: ${jobData.raw_job_text}

RESUME TEXT:
${resumeText}

Use the field template structure below for your analysis:
${JSON.stringify(hardSkillsTemplate.fieldResponse, null, 2)}`
    : `Analyze this resume text against the following job posting:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.raw_job_text}

RESUME TEXT:
${resumeText}

First, identify the key hard skills required for this job by analyzing the job description.
Then, evaluate how well the resume demonstrates each of these hard skills.

Use the field template structure below for your analysis:
${JSON.stringify(hardSkillsTemplate.fieldResponse, null, 2)}`;

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

  console.log("hardSkills systemPrompt", systemPrompt)
  console.log("hardSkills userPrompt", userPrompt)

  // Parse the response
  const responseText = result.response.text();
  return processAIResponse(responseText);
} 