// Enhanced JavaScript object representing a comprehensive ATS resume assessment
const resumeAssessment = {
    // Meta information about the assessment
    meta: {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      assessmentType: "Resume ATS Compatibility and Quality Analysis"
    },
    
    // All assessment categories with their respective sections and fields
    assessmentCategories: {
      searchability: {
        label: "Searchability",
        description: "An ATS (Applicant Tracking System) is a software used by 90% of companies and recruiters to search for resumes and manage the hiring process. Below is how well your resume appears in an ATS and a recruiter search.",
        tip: "Fix the red Xs to ensure your resume is easily searchable by recruiters and parsed correctly by the ATS.",
        // Integrated overall score
        score: 0, // Calculate and return this value
        maxScore: 100,
        scoreLabel: "Searchability Score",
        scoreDescription: "How well your resume can be found and parsed by ATS systems and recruiters",
        
        sections: [
          // Contact information assessment
          {
            id: "contactInformation", // Return this value
            label: "Contact Information",
            fields: [
              {
                id: "physicalAddressPresent", // Return this value
                value: true, // Calculate and return this value
                tooltip: "You provided your physical address. Recruiters use your address to validate your location for job matches.",  // Calculate and return this value
                label: "Verification that physical address is present for geographic matching",
                prompt: "Identify if the resume contains a complete physical address including street, city, state/province, and postal code.",
                type: "boolean",
                weight: 5 // Calculate and return this value
              },
              {
                id: "emailPresent", // Return this value
                value: true, // Calculate and return this value
                tooltip: "You provided your email. Recruiters use your email to contact you for job matches.", // Calculate and return this value
                label: "Confirmation that email address is properly included for contact purposes",
                prompt: "Check if the resume contains a valid, professional email address in standard format.",
                type: "boolean",
                weight: 5 // Calculate and return this value
              },
              {
                id: "phonePresent", // Return this value
                value: true, // Calculate and return this value
                tooltip: "You provided your phone number.", // Calculate and return this value
                label: "Verification that phone number is included in contact information",
                prompt: "Verify if the resume includes a phone number in a standard, readable format.",
                type: "boolean",
                weight: 5 // Calculate and return this value
              }
            ]
          },
          
          // Summary section assessment
          {
            id: "summary", // Return this value
            label: "Summary",
            fields: [
              {
                id: "summaryPresent", // Return this value
                value: true, // Calculate and return this value
                tooltip: "We found a summary section on your resume. Good job! The summary provides a quick overview of the candidate's qualifications, helping recruiters and hiring managers promptly grasp the value the candidate can offer in the position.", // Calculate and return this value
                label: "Assessment of whether resume contains a proper summary section that quickly communicates candidate value",
                prompt: "Determine if the resume contains a clear summary or profile section that concisely presents the candidate's value proposition and key qualifications.",
                type: "boolean",
                weight: 10 // Calculate and return this value
              }
            ]
          },
          
          // Section headings assessment
          {
            id: "sectionHeadings", // Return this value
            label: "Section Headings",
            fields: [
              {
                id: "educationSectionPresent", // Return this value
                value: false, // Calculate and return this value
                tooltip: "We couldn't find an \"Education\" section in your resume. Ensure your resume includes an education section labeled as \"Education\" to ensure ATS can accurately recognize your academic qualifications.", // Calculate and return this value
                label: "Verification that resume contains a properly labeled Education section for ATS parsing",
                prompt: "Check if the resume contains a clearly labeled 'Education' section with the exact heading 'Education'.",
                type: "boolean",
                weight: 10 // Calculate and return this value
              },
              {
                id: "workExperienceSectionPresent", // Return this value
                value: true, // Calculate and return this value
                tooltip: "We found the work experience section in your resume.", // Calculate and return this value
                label: "Confirmation that work experience section is properly included and labeled",
                prompt: "Verify if the resume contains a clearly labeled section for work experience (may be called 'Experience', 'Work Experience', 'Professional Experience', or similar).",
                type: "boolean",
                weight: 10 // Calculate and return this value
              }
            ]
          },
          
          // Job title match assessment
          {
            id: "jobTitleMatch", // Return this value
            label: "Job Title Match",
            fields: [
              {
                id: "jobTitleIncluded", // Return this value
                value: false, // Calculate and return this value
                tooltip: "The Solution Architect job title provided or found in the job description was not found in your resume. We recommend having the exact title of the job for which you're applying in your resume. This ensures you'll be found when a recruiter searches by job title. If you haven't held this position before, include it as part of your summary statement.", // Calculate and return this value
                label: "Assessment of whether the exact job title being applied for appears in the resume",
                prompt: "Compare the job title from the job description with the content of the resume to verify if the exact job title appears somewhere in the resume, particularly in the work experience or summary sections.",
                type: "boolean",
                weight: 15, // Calculate and return this value
              }
            ]
          },
          
          // Date formatting assessment
          {
            id: "dateFormatting", // Return this value
            label: "Date Formatting",
            fields: [
              {
                id: "correctDateFormat", // Return this value
                value: false, // Calculate and return this value
                tooltip: "ATS and recruiters prefer specific date formatting for your work experience. Please use the following formats: \"MM/YY or MM/YYYY or Month YYYY\" (e.g. 03/19, 03/2019, Mar 2019 or March 2019).", // Calculate and return this value
                label: "Verification that work experience dates follow ATS-preferred formatting standards",
                prompt: "Examine all date formats in the work experience section to ensure they follow one of these ATS-friendly formats: MM/YY, MM/YYYY, Month YYYY, or Month Year. Flag any dates that don't conform to these patterns.",
                type: "boolean",
                weight: 10, // Calculate and return this value
              }
            ]
          },
          
          // Education match assessment
          {
            id: "educationMatch", // Return this value
            label: "Education Match",
            fields: [
              {
                id: "meetsEducationRequirements", // Return this value
                value: true, // Calculate and return this value
                tooltip: "The job description does not list required or preferred education, but your education is noted.", // Calculate and return this value
                label: "Assessment of whether the candidate's education matches job requirements",
                prompt: "Compare the education requirements in the job description with the education qualifications listed in the resume to determine if the candidate meets or exceeds the education requirements.",
                type: "boolean",
                weight: 10,
              }
            ]
          },
          
          // File type assessment
          {
            id: "fileType", // Return this value
            label: "File Type",
            fields: [
              {
                id: "isPdfFormat", // Return this value
                value: true, // Calculate and return this value
                tooltip: "You are using a .pdf resume, which is the preferred format for most ATS systems.", // Calculate and return this value
                label: "Verification that resume is in PDF format, which is optimal for ATS parsing",
                prompt: "Check if the uploaded resume file has a .pdf extension, which is the preferred format for ATS compatibility.",
                type: "boolean",
                weight: 5 // Calculate and return this value
              },
              {
                id: "noSpecialCharactersInFilename", // Return this value
                value: true, // Calculate and return this value
                tooltip: "Your file name doesn't contain special characters that could cause an error in ATS.", // Calculate and return this value
                label: "Confirmation that filename doesn't contain problematic special characters",
                prompt: "Examine the resume filename to ensure it doesn't contain special characters like !, @, #, $, %, ^, &, *, etc., which could cause parsing errors in ATS systems.",
                type: "boolean",
                weight: 5 // Calculate and return this value
              },
              {
                id: "conciseFilename", // Return this value
                value: true, // Calculate and return this value
                tooltip: "Your file name is concise and readable.", // Calculate and return this value
                label: "Verification that filename follows best practices for readability and conciseness", // Calculate and return this value
                prompt: "Verify that the resume filename is concise, readable, and follows best practices (e.g., FirstName_LastName_Resume.pdf or similar).", // Calculate and return this value
                type: "boolean",
                weight: 5 // Calculate and return this value
              }
            ]
          }
        ]
      },
      
      bestPractices: {
        label: "Best Practices",
        description: "Resume best practices are standard conventions and formatting that make your resume professional and easy to read for both ATS systems and human recruiters.",
        tip: "Following these best practices can significantly improve the impact and effectiveness of your resume.",
        // Integrated overall score
        score: 0, // Calculate and return this value
        maxScore: 100,
        scoreLabel: "Best Practices Score",
        scoreDescription: "How well your resume follows resume writing best practices and standards",
        
        sections: [
          // Length assessment
          {
            id: "length", // Return this value
            label: "Resume Length",
            fields: [
              {
                id: "appropriateLength", // Return this value
                value: null, // Calculate and return this value
                tooltip: "Your resume length is appropriate for your experience level. Generally, 1-2 pages is ideal for most candidates.",
                label: "Assessment of whether resume length is appropriate for candidate's experience level",
                prompt: "Evaluate if the resume length (in pages) is appropriate based on the candidate's experience level. For early career (0-3 years): 1 page, mid-career (3-10 years): 1-2 pages, senior (10+ years): 2-3 pages maximum.",
                type: "boolean",
                weight: 10 // Calculate and return this value
              }
            ]
          },
          
          // Formatting assessment
          {
            id: "formatting", // Return this value
            label: "Formatting",
            fields: [
              {
                id: "consistentFormatting", // Return this value
                value: null, // Calculate and return this value
                tooltip: "Your resume uses consistent formatting for sections, which improves readability and ATS compatibility.",
                label: "Evaluation of formatting consistency throughout the resume",
                prompt: "Check if the resume maintains consistent formatting throughout, including consistent use of fonts, bullet points, indentation, section headers, and spacing.",
                type: "boolean",
                weight: 10 // Calculate and return this value
              },
              {
                id: "readableFonts", // Return this value
                value: null, // Calculate and return this value
                tooltip: "You've used standard, ATS-friendly fonts like Arial, Calibri, or Times New Roman.",
                label: "Verification that resume uses standard, ATS-friendly fonts",
                prompt: "Verify if the resume uses standard, ATS-friendly fonts like Arial, Calibri, Helvetica, Times New Roman, or other common sans-serif or serif fonts.",
                type: "boolean",
                weight: 5 // Calculate and return this value
              },
              {
                id: "properMargins", // Return this value
                value: null, // Calculate and return this value
                tooltip: "Your resume has appropriate margins (0.5-1 inch) to maximize space while maintaining readability.",
                label: "Assessment of margin size and consistency",
                prompt: "Check if the resume has appropriate and consistent margins (typically 0.5-1 inch on all sides) that maximize content space while maintaining a clean, readable appearance.",
                type: "boolean",
                weight: 5 // Calculate and return this value
              }
            ]
          },
          
          // Content quality assessment
          {
            id: "contentQuality", // Return this value
            label: "Content Quality",
            fields: [
              {
                id: "achievementFocused", // Return this value
                value: null, // Calculate and return this value
                tooltip: "Your resume effectively highlights achievements with quantifiable results rather than just listing duties.",
                label: "Assessment of achievement-focused content versus duty descriptions",
                prompt: "Evaluate if the resume emphasizes quantifiable achievements and results rather than just listing job duties. Look for metrics, percentages, dollar amounts, and specific outcomes that demonstrate impact.",
                type: "boolean",
                weight: 15 // Calculate and return this value
              },
              {
                id: "actionVerbs", // Return this value
                value: null, // Calculate and return this value
                tooltip: "Your resume uses strong action verbs to begin bullet points, which shows initiative and impact.",
                label: "Verification of action verb usage at the beginning of bullet points",
                prompt: "Check if bullet points begin with strong action verbs (e.g., 'Led', 'Implemented', 'Developed', 'Created', 'Managed', etc.) to convey accomplishments effectively.",
                type: "boolean",
                weight: 10 // Calculate and return this value
              },
              {
                id: "spellingGrammar", // Return this value
                value: null, // Calculate and return this value
                tooltip: "Your resume is free from spelling and grammatical errors, which shows attention to detail.",
                label: "Assessment of spelling and grammatical correctness",
                prompt: "Evaluate the resume for spelling and grammatical errors, typos, punctuation issues, and inconsistent capitalization.",
                type: "boolean",
                weight: 10 // Calculate and return this value
              }
            ]
          },
          
          // Customization assessment
          {
            id: "customization", // Return this value
            label: "Resume Customization",
            fields: [
              {
                id: "keywordsAligned", // Return this value
                value: null, // Calculate and return this value
                tooltip: "Your resume includes key skills and keywords from the job description, improving ATS match rate.",
                label: "Assessment of keyword alignment with job description",
                prompt: "Check if the resume incorporates relevant keywords and phrases from the job description naturally throughout the document. This includes technical skills, software, methodologies, and industry-specific terminology.",
                type: "boolean",
                weight: 15 // Calculate and return this value
              },
              {
                id: "relevantExperienceHighlighted", // Return this value
                value: null, // Calculate and return this value
                tooltip: "You've emphasized the most relevant experience for the target position.",
                label: "Verification that most relevant experience is prominently featured",
                prompt: "Determine if the resume emphasizes experiences and skills most relevant to the target position, especially in the summary and top portions of the work experience section.",
                type: "boolean",
                weight: 15 // Calculate and return this value
              }
            ]
          }
        ]
      },
      
      hardSkills: {
        label: "Hard Skills",
        description: "Hard skills enable you to perform job-specific duties and responsibilities. You can learn hard skills in the classroom, training courses, and on the job. These skills are typically focused on teachable tasks and measurable abilities such as the use of tools, equipment, or software. Hard skills have a high impact on your match score.",
        tip: "Match the skills in your resume to the exact spelling in the job description. Prioritize skills that appear most frequently in the job description.",
        // Integrated overall score
        score: 0, // Calculate and return this value
        maxScore: 100,
        scoreLabel: "Hard Skills Score",
        scoreDescription: "Assessment of technical and job-specific skills relevant to the position",
        
        sections: [
          {
            id: "skillsComparison",
            label: "Skills Comparison",
            description: "Comparison of hard skills mentioned in the job description against those found in your resume.",
            fields: [],  // Will be dynamically populated
            fieldPrompt: "For each skill identified in the job description that is a hard technical skill, create a field with the following structure: { id: skillName, jobDescriptionValue: count of mentions in job description, resumeValue: boolean representing presence in resume, label: exact skill name as it appears in job description, tooltip: feedback on whether the skill is present in the resume and how it could be better highlighted, prompt: instruction for verifying if this specific skill appears in the resume, type: 'comparison' }",
            metaPrompt: "First analyze the job description to extract all hard skills. Hard skills are specific technical abilities, tools, programming languages, methodologies, certifications, or technical knowledge areas. Examples include: software development languages (Python, Java), tools (Excel, Photoshop), methodologies (Agile, DevOps), technologies (AWS, microservices), or industry-specific technical knowledge (data analytics, circuit design). For each hard skill identified, check if it appears in the resume. Pay attention to exact matches, synonyms, and related terminology. Count how many times each skill is mentioned in the job description to determine its importance."
          },
          
          {
            id: "highlightedSkills",
            label: "Highlighted Skills",
            description: "Key hard skills from the job description that should be emphasized in your resume.",
            fields: [],  // Will be dynamically populated
            fieldPrompt: "For the most frequently mentioned hard skills in the job description (up to 5), create a field with the following structure: { id: skillName + '_highlight', value: boolean representing importance based on frequency, label: exact skill name, tooltip: why this skill is important for the role based on the job description, prompt: instruction to verify how important this skill appears to be for the role, type: 'boolean' }",
            metaPrompt: "Identify the 3-5 most frequently mentioned hard skills in the job description. These represent the critical technical capabilities the employer is seeking. For each of these key skills, provide specific context on why they appear to be important for the role and how prominently they should be featured in the resume."
          },
          
          {
            id: "skillGapAnalysis",
            label: "Skill Gap Analysis",
            description: "Analysis of critical hard skills mentioned in the job description but missing from your resume.",
            fields: [],  // Will be dynamically populated
            fieldPrompt: "For hard skills that appear frequently in the job description but are missing from the resume, create a field with the following structure: { id: skillName + '_gap', value: boolean representing whether this critical skill is missing, label: 'Missing: ' + skillName, tooltip: specific suggestion for how to address this skill gap in the resume, prompt: instruction to analyze whether this specific skill gap represents a critical deficiency for the application, type: 'boolean', weight: numerical value based on frequency in job description }",
            metaPrompt: "Identify any frequently mentioned hard skills in the job description that are completely absent from the resume. For each missing skill, assess whether it appears to be a core requirement or merely a 'nice-to-have' based on its context and frequency in the job description. Provide specific, actionable suggestions for how the candidate could address each skill gap."
          }
        ]
      },
      
      softSkills: {
        label: "Soft Skills",
        description: "Soft skills are your traits and abilities that are not unique to any job. Your soft skills are part of your personality, and can be learned also. These skills are the traits that typically make you a good employee for any company such as time management and communication. Soft skills have a medium impact on your match score.",
        tip: "Prioritize hard skills in your resume to get interviews, and then showcase your soft skills in the interview to get jobs.",
        // Integrated overall score
        score: 0, // Calculate and return this value
        maxScore: 100,
        scoreLabel: "Soft Skills Score",
        scoreDescription: "Evaluation of interpersonal and transferable skills highlighted in your resume",
        
        sections: [
          {
            id: "skillsComparison",
            label: "Skills Comparison",
            description: "Comparison of soft skills mentioned in the job description against those found in your resume.",
            fields: [],  // Will be dynamically populated
            fieldPrompt: "For each soft skill identified in the job description, create a field with the following structure: { id: skillName, jobDescriptionValue: count of mentions in job description, resumeValue: boolean representing presence in resume, label: exact skill name as it appears in job description, tooltip: guidance on how this soft skill could be better demonstrated in the resume through specific achievements, prompt: instruction for verifying if this specific skill is demonstrated in the resume, type: 'comparison' }",
            metaPrompt: "Analyze the job description to extract all soft skills. Soft skills are interpersonal and transferable attributes such as communication, leadership, teamwork, problem-solving, adaptability, time management, creativity, and emotional intelligence. For each soft skill identified, determine whether it's explicitly mentioned or implicitly demonstrated in the resume through accomplishments, responsibilities, or described interactions. Count mentions in the job description to determine importance. Pay particular attention to soft skills that are repeatedly emphasized or appear in key sections like requirements or qualifications."
          },
          
          {
            id: "highlightedSkills",
            label: "Highlighted Skills",
            description: "Key soft skills from the job description that should be demonstrated in your resume.",
            fields: [],  // Will be dynamically populated
            fieldPrompt: "For the most frequently mentioned soft skills in the job description (up to 3), create a field with the following structure: { id: skillName + '_highlight', value: boolean representing importance based on frequency, label: exact skill name, tooltip: specific suggestion for how to demonstrate this soft skill through achievements rather than just stating it, prompt: instruction to verify how important this soft skill appears to be for the role and company culture, type: 'boolean' }",
            metaPrompt: "Identify the 2-3 most emphasized soft skills in the job description. These represent the interpersonal capabilities most valued for this role and organization. For each key soft skill, provide specific suggestions on how the candidate could demonstrate this trait through concrete achievements or experiences rather than simply listing it."
          },
          
          {
            id: "demonstratedSkills",
            label: "Demonstrated Skills",
            description: "Soft skills that are effectively demonstrated through achievements in your resume.",
            fields: [],  // Will be dynamically populated
            fieldPrompt: "For soft skills that are effectively demonstrated through achievements in the resume (even if not explicitly named), create a field with the following structure: { id: skillName + '_demonstrated', value: boolean representing whether this skill is effectively shown through accomplishments, label: skillName + ' (Demonstrated)', tooltip: highlight of how this soft skill is currently shown through achievements and possibly how it could be enhanced, prompt: instruction to analyze whether this soft skill is demonstrated effectively through specific achievements rather than just stated, type: 'boolean' }",
            metaPrompt: "Review the resume for evidence of soft skills demonstrated through specific achievements, responsibilities, or project outcomes, even if the skills aren't explicitly named. For example, leading a team project demonstrates leadership, resolving conflicts shows interpersonal skills, and meeting tight deadlines reflects time management. For each soft skill effectively demonstrated, note the specific achievements that illustrate it and possibly suggest enhancements."
          }
        ]
      }
    },
    
    // Method to calculate scores based on field values and weights
    calculateScores: function() {
      // For each category, calculate the score based on field values and weights
      for (const categoryKey in this.assessmentCategories) {
        const category = this.assessmentCategories[categoryKey];
        let totalPoints = 0;
        let maxPoints = 0;
        
        // Loop through each section in the category
        for (const section of category.sections) {
          const fields = section.fields;
          
          // Sum up points from each field
          for (const field of fields) {
            // For standard boolean fields
            if (field.type === 'boolean' && field.value === true) {
              totalPoints += field.weight || 1; // Default weight of 1 if not specified
              maxPoints += field.weight || 1;
            } 
            // For boolean fields that should always contribute to maxPoints
            else if (field.type === 'boolean') {
              maxPoints += field.weight || 1;
            }
            // For comparison fields (used in skills comparison)
            else if (field.type === 'comparison') {
              // If the skill is in the resume, add points based on job description importance
              if (field.resumeValue === true) {
                // Weight is proportional to mentions in job description
                const weight = field.jobDescriptionValue || 1;
                totalPoints += weight;
              }
              // Always add to max points based on job description importance
              maxPoints += field.jobDescriptionValue || 1;
            }
          }
        }
        
        // Calculate percentage score (if maxPoints is 0, score is 0)
        const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
        
        // Update the category score directly
        category.score = score;
      }
      
      return this.assessmentCategories;
    },
    
    // Method to get fields that need improvement (value is false)
    getImprovementAreas: function() {
      const improvementAreas = {};
      
      for (const categoryKey in this.assessmentCategories) {
        improvementAreas[categoryKey] = [];
        const category = this.assessmentCategories[categoryKey];
        
        // Loop through each section in the category
        for (const section of category.sections) {
          const fields = section.fields;
          
          // Find fields that need improvement
          for (const field of fields) {
            if (field.value === false) {
              improvementAreas[categoryKey].push({
                sectionId: section.id,
                sectionLabel: section.label,
                fieldId: field.id,
                label: field.label,
                tooltip: field.tooltip,
                weight: field.weight,
                actionLink: field.actionLink || null
              });
            }
          }
        }
      }
      
      return improvementAreas;
    }
  };
  
  // Example usage:
  // resumeAssessment.calculateScores();
  // const improvementAreas = resumeAssessment.getImprovementAreas();