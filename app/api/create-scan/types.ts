// Base interface for all field responses
export interface BaseFieldResponse {
  id: string;       // Unique identifier for the field response
  c: number;        // Confidence score (0-1)
  e: string;        // Explanation/rationale for the assessment
}

// Interface for one-to-one field responses that have boolean values
export interface OneToOneFieldResponse extends BaseFieldResponse {
  v: boolean;       // Boolean value (true/false)
}

// Interface for one-to-many field responses that represent skills
export interface SkillFieldResponse extends BaseFieldResponse {
  p: string;        // Parent field ID (e.g., "hardSkills" or "softSkills")
  l: string;        // Label/name of the skill
  syn: string[];    // Array of synonyms for the skill
  rt: string[];     // Array of related terms for the skill
  em: boolean;      // Whether there's an exact match in the resume
  sm: boolean;      // Whether there's a synonym match in the resume
  rm: boolean;      // Whether there's a related term match in the resume
  emc: number;      // Count of exact matches in the resume
}

// Union type for all possible field responses
export type FieldResponse = OneToOneFieldResponse | SkillFieldResponse;

// The overall response type is an array of field responses
export type ResumeAnalysisResponse = FieldResponse[];

// Interface for field definitions used in v1-fields.ts
export interface FieldDefinition {
  id: string;
  fieldContext: {
    category: string;
    section: string;
    type: "one-to-one" | "one-to-many";
    label: string;
    prompt: string;
    weightInCategory: number;
  };
  fieldResponse: any; // The shape varies based on the field type
}

// Helper to calculate a match score from the analysis results
export function calculateMatchScore(response: ResumeAnalysisResponse): number {
  if (!response || response.length === 0) return 0;
  
  // Define category weights
  const categoryWeights = {
    hardSkills: 0.4,
    softSkills: 0.3,
    searchability: 0.15,
    bestPractices: 0.15
  };
  
  // Count matches per category
  const matches = {
    hardSkills: 0,
    hardSkillsTotal: 0,
    softSkills: 0,
    softSkillsTotal: 0,
    searchability: 0,
    searchabilityTotal: 0,
    bestPractices: 0,
    bestPracticesTotal: 0
  };
  
  // Process each field response
  response.forEach(item => {
    if ('p' in item) {
      // This is a skill field
      if (item.p === 'hardSkills') {
        matches.hardSkillsTotal++;
        if (item.em || item.sm || item.rm) matches.hardSkills++;
      } else if (item.p === 'softSkills') {
        matches.softSkillsTotal++;
        if (item.em || item.sm || item.rm) matches.softSkills++;
      }
    } else if ('v' in item) {
      // This is a one-to-one field
      const id = item.id;
      // Determine category from the field ID
      if (id.startsWith('searchability') || ['emailPresent', 'phonePresent', 'physicalAddressPresent'].includes(id)) {
        matches.searchabilityTotal++;
        if (item.v) matches.searchability++;
      } else {
        matches.bestPracticesTotal++;
        if (item.v) matches.bestPractices++;
      }
    }
  });
  
  // Calculate category scores
  const scores = {
    hardSkills: matches.hardSkillsTotal ? matches.hardSkills / matches.hardSkillsTotal : 0,
    softSkills: matches.softSkillsTotal ? matches.softSkills / matches.softSkillsTotal : 0,
    searchability: matches.searchabilityTotal ? matches.searchability / matches.searchabilityTotal : 0,
    bestPractices: matches.bestPracticesTotal ? matches.bestPractices / matches.bestPracticesTotal : 0
  };
  
  // Calculate weighted total score
  const totalScore = 
    scores.hardSkills * categoryWeights.hardSkills +
    scores.softSkills * categoryWeights.softSkills +
    scores.searchability * categoryWeights.searchability +
    scores.bestPractices * categoryWeights.bestPractices;
  
  // Return score as percentage
  return Math.round(totalScore * 100);
}

// Example of how to type-check the response:
export const validateResponse = (response: ResumeAnalysisResponse) => {
  return response.every(item => {
    // Check common fields
    if (typeof item.id !== 'string' || 
        typeof item.c !== 'number' || 
        typeof item.e !== 'string') {
      return false;
    }
    
    // Check if it's a skill response (has 'p' property)
    if ('p' in item) {
      return typeof item.p === 'string' &&
             typeof item.l === 'string' &&
             Array.isArray(item.syn) &&
             Array.isArray(item.rt) &&
             typeof item.em === 'boolean' &&
             typeof item.sm === 'boolean' &&
             typeof item.rm === 'boolean' &&
             typeof item.emc === 'number';
    }
    
    // Otherwise it should be a one-to-one response
    return typeof item.v === 'boolean';
  });
};