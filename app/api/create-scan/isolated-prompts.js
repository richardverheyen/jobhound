
const fields = [
    {
        id: "physicalAddressPresent",

        fieldContext: {
            category: "searchability",
            section: "contactInformation",
            type: "one-to-one", // use this prompt and additional fieldContext data to create a single field object using the fieldResponse structure
            label: "Physical Address Present",
            prompt: "Identify if the resume contains a complete physical address including street, city, state/province, and postal code.",
            weightInCategory: 5
        },

        fieldResponse: {
            id: "physicalAddressPresent",
            value: boolean,
            confidence: number,
            explanation: string,
        }
    },
    {
        id: "hardSkills",

        fieldContext: {
            category: "hardSkills",
            section: "hardSkills",
            type: "one-to-many", // use this prompt and additional fieldContext data to create as many field objects using the fieldResponse structure as justified by the prompt.
            label: "Hard skills enable you to perform job-specific duties and responsibilities. You can learn hard skills in the classroom, training courses, and on the job. These skills are typically focused on teachable tasks and measurable abilities such as the use of tools, equipment, or software. Hard skills have a high impact on your match score.",
            prompt: "First analyze the job description to extract all hard skills. Hard skills are specific technical abilities, tools, programming languages, methodologies, certifications, or technical knowledge areas. Examples include: software development languages (Python, Java), tools (Excel, Photoshop), methodologies (Agile, DevOps), technologies (AWS, microservices), or industry-specific technical knowledge (data analytics, circuit design). For each hard skill identified, check if it appears in the resume. Pay attention to exact matches, synonyms, and related terminology. Count how many times each skill is mentioned in the job description to determine its importance.",
            weightInCategory: 5
        },

        fieldResponse: {
            id: "${skillNameSlug}",
            label: "${skillName}",
            synonyms: string[],
            exactMatchInResume: boolean,
            synonymMatchInResume: boolean,
            relatedTermMatchInResume: boolean,
            confidence: number,
            explanation: string,
        }
    },
    {
        id: "softSkills",

        fieldContext: {
            category: "softSkills",
            section: "softSkills",
            type: "one-to-many", // use this prompt and additional fieldContext data to create as many field objects using the fieldResponse structure as justified by the prompt.
            label: "Soft skills are your traits and abilities that are not unique to any job. Your soft skills are part of your personality, and can be learned also. These skills are the traits that typically make you a good employee for any company such as time management and communication. Soft skills have a medium impact on your match score.",
            prompt: "Analyze the job description to extract all soft skills. Soft skills are interpersonal and transferable attributes such as communication, leadership, teamwork, problem-solving, adaptability, time management, creativity, and emotional intelligence. For each soft skill identified, determine whether it's explicitly mentioned or implicitly demonstrated in the resume through accomplishments, responsibilities, or described interactions. Count mentions in the job description to determine importance. Pay particular attention to soft skills that are repeatedly emphasized or appear in key sections like requirements or qualifications.",
            weightInCategory: 5
        },

        fieldResponse: {
            id: "${skillNameSlug}",
            label: "${skillName}",
            synonyms: string[],
            exactMatchInResume: boolean,
            synonymMatchInResume: boolean,
            relatedTermMatchInResume: boolean,
            confidence: number,
            explanation: string,
        }
    }
]


  const fieldPrompts = {
    searchability: {
      contactInformation: {
        physicalAddressPresent: "Identify if the resume contains a complete physical address including street, city, state/province, and postal code.",
        emailPresent: "Check if the resume contains a valid, professional email address in standard format.",
        phonePresent: "Verify if the resume includes a phone number in a standard, readable format."
      },
      summary: {
        summaryPresent: "Determine if the resume contains a clear summary or profile section that concisely presents the candidate's value proposition and key qualifications."
      },
      sectionHeadings: {
        educationSectionPresent: "Check if the resume contains a clearly labeled 'Education' section with the exact heading 'Education'.",
        workExperienceSectionPresent: "Verify if the resume contains a clearly labeled section for work experience (may be called 'Experience', 'Work Experience', 'Professional Experience', or similar)."
      },
      jobTitleMatch: {
        jobTitleIncluded: "Compare the job title from the job description with the content of the resume to verify if the exact job title appears somewhere in the resume, particularly in the work experience or summary sections."
      },
      dateFormatting: {
        correctDateFormat: "Examine all date formats in the work experience section to ensure they follow one of these ATS-friendly formats: MM/YY, MM/YYYY, Month YYYY, or Month Year. Flag any dates that don't conform to these patterns."
      },
      educationMatch: {
        meetsEducationRequirements: "Compare the education requirements in the job description with the education qualifications listed in the resume to determine if the candidate meets or exceeds the education requirements."
      },
      fileType: {
        isPdfFormat: "Check if the uploaded resume file has a .pdf extension, which is the preferred format for ATS compatibility.",
        noSpecialCharactersInFilename: "Examine the resume filename to ensure it doesn't contain special characters like !, @, #, $, %, ^, &, *, etc., which could cause parsing errors in ATS systems.",
        conciseFilename: "Verify that the resume filename is concise, readable, and follows best practices (e.g., FirstName_LastName_Resume.pdf or similar)."
      }
    },
    bestPractices: {
      length: {
        appropriateLength: "Evaluate if the resume length (in pages) is appropriate based on the candidate's experience level. For early career (0-3 years): 1 page, mid-career (3-10 years): 1-2 pages, senior (10+ years): 2-3 pages maximum."
      },
      formatting: {
        consistentFormatting: "Check if the resume maintains consistent formatting throughout, including consistent use of fonts, bullet points, indentation, section headers, and spacing.",
        readableFonts: "Verify if the resume uses standard, ATS-friendly fonts like Arial, Calibri, Helvetica, Times New Roman, or other common sans-serif or serif fonts.",
        properMargins: "Check if the resume has appropriate and consistent margins (typically 0.5-1 inch on all sides) that maximize content space while maintaining a clean, readable appearance."
      },
      contentQuality: {
        achievementFocused: "Evaluate if the resume emphasizes quantifiable achievements and results rather than just listing job duties. Look for metrics, percentages, dollar amounts, and specific outcomes that demonstrate impact.",
        actionVerbs: "Check if bullet points begin with strong action verbs (e.g., 'Led', 'Implemented', 'Developed', 'Created', 'Managed', etc.) to convey accomplishments effectively.",
        spellingGrammar: "Evaluate the resume for spelling and grammatical errors, typos, punctuation issues, and inconsistent capitalization."
      },
      customization: {
        keywordsAligned: "Check if the resume incorporates relevant keywords and phrases from the job description naturally throughout the document. This includes technical skills, software, methodologies, and industry-specific terminology.",
        relevantExperienceHighlighted: "Determine if the resume emphasizes experiences and skills most relevant to the target position, especially in the summary and top portions of the work experience section."
      }
    },
    hardSkills: {
      metaPrompt: "First analyze the job description to extract all hard skills. Hard skills are specific technical abilities, tools, programming languages, methodologies, certifications, or technical knowledge areas. Examples include: software development languages (Python, Java), tools (Excel, Photoshop), methodologies (Agile, DevOps), technologies (AWS, microservices), or industry-specific technical knowledge (data analytics, circuit design). For each hard skill identified, check if it appears in the resume. Pay attention to exact matches, synonyms, and related terminology. Count how many times each skill is mentioned in the job description to determine its importance."
    },
    softSkills: {
      metaPrompt: "Analyze the job description to extract all soft skills. Soft skills are interpersonal and transferable attributes such as communication, leadership, teamwork, problem-solving, adaptability, time management, creativity, and emotional intelligence. For each soft skill identified, determine whether it's explicitly mentioned or implicitly demonstrated in the resume through accomplishments, responsibilities, or described interactions. Count mentions in the job description to determine importance. Pay particular attention to soft skills that are repeatedly emphasized or appear in key sections like requirements or qualifications."
    }
  };