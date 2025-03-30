import { FieldDefinition } from './types';

const fields: FieldDefinition[] = [
    {
        id: "physicalAddressPresent",
        
        fieldContext: {
            category: "searchability",
            section: "contactInformation",
            type: "one-to-one",
            label: "Verification that physical address is present for geographic matching",
            prompt: "Identify if the resume contains a complete physical address including street, city, state/province, and postal code.",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "physicalAddressPresent",
            parentFieldId: "physicalAddressPresent",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "emailPresent",
        
        fieldContext: {
            category: "searchability",
            section: "contactInformation",
            type: "one-to-one",
            label: "Confirmation that email address is properly included for contact purposes",
            prompt: "Check if the resume contains a valid, professional email address in standard format.",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "emailPresent",
            parentFieldId: "emailPresent",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "phonePresent",
        
        fieldContext: {
            category: "searchability",
            section: "contactInformation",
            type: "one-to-one",
            label: "Verification that phone number is included in contact information",
            prompt: "Verify if the resume includes a phone number in a standard, readable format.",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "phonePresent",
            parentFieldId: "phonePresent",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "summaryPresent",
        
        fieldContext: {
            category: "searchability",
            section: "summary",
            type: "one-to-one",
            label: "Assessment of whether resume contains a proper summary section that quickly communicates candidate value",
            prompt: "Determine if the resume contains a clear summary or profile section that concisely presents the candidate's value proposition and key qualifications.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "summaryPresent",
            parentFieldId: "summaryPresent",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "educationSectionPresent",
        
        fieldContext: {
            category: "searchability",
            section: "sectionHeadings",
            type: "one-to-one",
            label: "Verification that resume contains a properly labeled Education section for ATS parsing",
            prompt: "Check if the resume contains a clearly labeled 'Education' section with the exact heading 'Education'.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "educationSectionPresent",
            parentFieldId: "educationSectionPresent",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "workExperienceSectionPresent",
        
        fieldContext: {
            category: "searchability",
            section: "sectionHeadings",
            type: "one-to-one",
            label: "Confirmation that work experience section is properly included and labeled",
            prompt: "Verify if the resume contains a clearly labeled section for work experience (may be called 'Experience', 'Work Experience', 'Professional Experience', or similar).",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "workExperienceSectionPresent",
            parentFieldId: "workExperienceSectionPresent",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "jobTitleIncluded",
        
        fieldContext: {
            category: "searchability",
            section: "jobTitleMatch",
            type: "one-to-one",
            label: "Assessment of whether the exact job title being applied for appears in the resume",
            prompt: "Compare the job title from the job description with the content of the resume to verify if the exact job title appears somewhere in the resume, particularly in the work experience or summary sections.",
            weightInCategory: 15
        },
        
        fieldResponse: {
            id: "jobTitleIncluded",
            parentFieldId: "jobTitleIncluded",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "correctDateFormat",
        
        fieldContext: {
            category: "searchability",
            section: "dateFormatting",
            type: "one-to-one",
            label: "Verification that work experience dates follow ATS-preferred formatting standards",
            prompt: "Examine all date formats in the work experience section to ensure they follow one of these ATS-friendly formats: MM/YY, MM/YYYY, Month YYYY, or Month Year. Flag any dates that don't conform to these patterns.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "correctDateFormat",
            parentFieldId: "correctDateFormat",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "meetsEducationRequirements",
        
        fieldContext: {
            category: "searchability",
            section: "educationMatch",
            type: "one-to-one",
            label: "Assessment of whether the candidate's education matches job requirements",
            prompt: "Compare the education requirements in the job description with the education qualifications listed in the resume to determine if the candidate meets or exceeds the education requirements.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "meetsEducationRequirements",
            parentFieldId: "meetsEducationRequirements",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "isPdfFormat",
        
        fieldContext: {
            category: "searchability",
            section: "fileType",
            type: "one-to-one",
            label: "Verification that resume is in PDF format, which is optimal for ATS parsing",
            prompt: "Check if the uploaded resume file has a .pdf extension, which is the preferred format for ATS compatibility.",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "isPdfFormat",
            parentFieldId: "isPdfFormat",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "noSpecialCharactersInFilename",
        
        fieldContext: {
            category: "searchability",
            section: "fileType",
            type: "one-to-one",
            label: "Confirmation that filename doesn't contain problematic special characters",
            prompt: "Examine the resume filename to ensure it doesn't contain special characters like !, @, #, $, %, ^, &, *, etc., which could cause parsing errors in ATS systems.",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "noSpecialCharactersInFilename",
            parentFieldId: "noSpecialCharactersInFilename",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "conciseFilename",
        
        fieldContext: {
            category: "searchability",
            section: "fileType",
            type: "one-to-one",
            label: "Verification that filename follows best practices for readability and conciseness",
            prompt: "Verify that the resume filename is concise, readable, and follows best practices (e.g., FirstName_LastName_Resume.pdf or similar).",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "conciseFilename",
            parentFieldId: "conciseFilename",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "appropriateLength",
        
        fieldContext: {
            category: "bestPractices",
            section: "length",
            type: "one-to-one",
            label: "Assessment of whether resume length is appropriate for candidate's experience level",
            prompt: "Evaluate if the resume length (in pages) is appropriate based on the candidate's experience level. For early career (0-3 years): 1 page, mid-career (3-10 years): 1-2 pages, senior (10+ years): 2-3 pages maximum.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "appropriateLength",
            parentFieldId: "appropriateLength",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "consistentFormatting",
        
        fieldContext: {
            category: "bestPractices",
            section: "formatting",
            type: "one-to-one",
            label: "Evaluation of formatting consistency throughout the resume",
            prompt: "Check if the resume maintains consistent formatting throughout, including consistent use of fonts, bullet points, indentation, section headers, and spacing.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "consistentFormatting",
            parentFieldId: "consistentFormatting",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "readableFonts",
        
        fieldContext: {
            category: "bestPractices",
            section: "formatting",
            type: "one-to-one",
            label: "Verification that resume uses standard, ATS-friendly fonts",
            prompt: "Verify if the resume uses standard, ATS-friendly fonts like Arial, Calibri, Helvetica, Times New Roman, or other common sans-serif or serif fonts.",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "readableFonts",
            parentFieldId: "readableFonts",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "properMargins",
        
        fieldContext: {
            category: "bestPractices",
            section: "formatting",
            type: "one-to-one",
            label: "Assessment of margin size and consistency",
            prompt: "Check if the resume has appropriate and consistent margins (typically 0.5-1 inch on all sides) that maximize content space while maintaining a clean, readable appearance.",
            weightInCategory: 5
        },
        
        fieldResponse: {
            id: "properMargins",
            parentFieldId: "properMargins",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "achievementFocused",
        
        fieldContext: {
            category: "bestPractices",
            section: "contentQuality",
            type: "one-to-one",
            label: "Assessment of achievement-focused content versus duty descriptions",
            prompt: "Evaluate if the resume emphasizes quantifiable achievements and results rather than just listing job duties. Look for metrics, percentages, dollar amounts, and specific outcomes that demonstrate impact.",
            weightInCategory: 15
        },
        
        fieldResponse: {
            id: "achievementFocused",
            parentFieldId: "achievementFocused",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "actionVerbs",
        
        fieldContext: {
            category: "bestPractices",
            section: "contentQuality",
            type: "one-to-one",
            label: "Verification of action verb usage at the beginning of bullet points",
            prompt: "Check if bullet points begin with strong action verbs (e.g., 'Led', 'Implemented', 'Developed', 'Created', 'Managed', etc.) to convey accomplishments effectively.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "actionVerbs",
            parentFieldId: "actionVerbs",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "spellingGrammar",
        
        fieldContext: {
            category: "bestPractices",
            section: "contentQuality",
            type: "one-to-one",
            label: "Assessment of spelling and grammatical correctness",
            prompt: "Evaluate the resume for spelling and grammatical errors, typos, punctuation issues, and inconsistent capitalization.",
            weightInCategory: 10
        },
        
        fieldResponse: {
            id: "spellingGrammar",
            parentFieldId: "spellingGrammar",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "keywordsAligned",
        
        fieldContext: {
            category: "bestPractices",
            section: "customization",
            type: "one-to-one",
            label: "Assessment of keyword alignment with job description",
            prompt: "Check if the resume incorporates relevant keywords and phrases from the job description naturally throughout the document. This includes technical skills, software, methodologies, and industry-specific terminology.",
            weightInCategory: 15
        },
        
        fieldResponse: {
            id: "keywordsAligned",
            parentFieldId: "keywordsAligned",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "relevantExperienceHighlighted",
        
        fieldContext: {
            category: "bestPractices",
            section: "customization",
            type: "one-to-one",
            label: "Verification that most relevant experience is prominently featured",
            prompt: "Determine if the resume emphasizes experiences and skills most relevant to the target position, especially in the summary and top portions of the work experience section.",
            weightInCategory: 15
        },
        
        fieldResponse: {
            id: "relevantExperienceHighlighted",
            parentFieldId: "relevantExperienceHighlighted",
            value: false,
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "hardSkills",

        fieldContext: {
            category: "hardSkills",
            section: "hardSkills",
            type: "one-to-many", // Generate multiple response objects, each with a unique ID and hardSkills as parentFieldId
            label: "Hard skills enable you to perform job-specific duties and responsibilities. You can learn hard skills in the classroom, training courses, and on the job. These skills are typically focused on teachable tasks and measurable abilities such as the use of tools, equipment, or software. Hard skills have a high impact on your match score.",
            prompt: "For each hard skill in the list identified in step 0: 1) Create a response object with a slug-style ID. 2) Set 'label' to the skill name as it appears in the job description. 3) For 'synonyms', ONLY include variations of this skill that actually appear in the resume (e.g., if the job requires 'JavaScript' and the resume mentions 'JS' or 'ECMAScript', list these as synonyms; if no variations appear, leave empty). 4) Set 'exactMatchInResume' to true only if the exact skill name appears in the resume. 5) Set 'synonymMatchInResume' to true only if any identified synonym appears. 6) For 'relatedTermMatchInResume', set to true if the resume contains technologies, tools, or methodologies that strongly imply knowledge of the required skill (e.g., if 'AWS' is required and resume mentions 'EC2' or 'S3'). 7) Set confidence based on specificity and prominence of matches. 8) In the explanation, cite specific examples from the resume with locations or context where the skill or related terms appear.",
            weightInCategory: 5
        },

        fieldResponse: {
            id: "${skillNameSlug}", // Generate a unique ID for each skill
            parentFieldId: "hardSkills", // Include this field's ID as the parentFieldId
            label: "${skillName}",
            exactMatchInResume: false,
            synonymMatchInResume: false,
            relatedTermMatchInResume: false,
            exactMatchCount: 0,
            synonyms: [],
            relatedTerms: [],
            confidence: 0,
            explanation: "",
        }
    },
    {
        id: "softSkills",

        fieldContext: {
            category: "softSkills",
            section: "softSkills",
            type: "one-to-many", // Generate multiple response objects, each with a unique ID and softSkills as parentFieldId
            label: "Soft skills are your traits and abilities that are not unique to any job. Your soft skills are part of your personality, and can be learned also. These skills are the traits that typically make you a good employee for any company such as time management and communication. Soft skills have a medium impact on your match score.",
            prompt: "For each soft skill in the list identified in step 0: 1) Create a response object with a slug-style ID. 2) Set 'label' to the skill name as it appears in the job description. 3) For 'synonyms', ONLY include alternative terms for this skill that actually appear in the resume (e.g., if 'Leadership' is required and 'Team Management' appears in the resume, list it as a synonym; if no variations appear, leave empty). 4) Set 'exactMatchInResume' to true only if the exact skill name appears in the resume. 5) Set 'synonymMatchInResume' to true only if any identified synonym appears. 6) For 'relatedTermMatchInResume', set to true if the resume contains clear behavioral examples or accomplishments that demonstrate this skill without naming it explicitly (e.g., 'Led cross-functional team' demonstrates leadership). 7) Set confidence based on how clearly the skill is demonstrated. 8) In the explanation, quote specific language from the resume that shows the skill, whether explicitly mentioned or implied through described accomplishments.",
            weightInCategory: 5
        },

        fieldResponse: {
            id: "${skillNameSlug}", // Generate a unique ID for each skill
            parentFieldId: "softSkills", // Include this field's ID as the parentFieldId
            label: "${skillName}",
            exactMatchInResume: false,
            synonymMatchInResume: false,
            relatedTermMatchInResume: false,
            exactMatchCount: 0,
            synonyms: [],
            relatedTerms: [],
            confidence: 0,
            explanation: "",
        }
    }
];

export { fields }; 