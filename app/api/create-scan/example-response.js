// ATS Resume Assessment Results
const resumeAssessment = {
    // Meta information about the assessment
    meta: {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      assessmentType: "Resume ATS Compatibility and Quality Analysis"
    },
    
    // Overall scores for each category
    overallScores: {
      searchability: {
        
      },
      hardSkills: {
        score: 75,
        maxScore: 100,
        label: "Hard Skills Score",
        description: "Assessment of technical and job-specific skills relevant to the position"
      },
      softSkills: {
        score: 80,
        maxScore: 100,
        label: "Soft Skills Score",
        description: "Evaluation of interpersonal and transferable skills highlighted in your resume"
      },
      bestPractices: {
        score: 85,
        maxScore: 100,
        label: "Best Practices Score",
        description: "How well your resume follows resume writing best practices and standards"
      }
    },
    
    // All assessment categories with their respective sections and fields
    assessmentCategories: {
      // SEARCHABILITY CATEGORY
      searchability: {

        score: 70,
        maxScore: 100,
        label: "Searchability Score",
        description: "How well your resume can be found and parsed by ATS systems and recruiters",

        label: "Searchability",
        description: "An ATS (Applicant Tracking System) is a software used by 90% of companies and recruiters to search for resumes and manage the hiring process. Below is how well your resume appears in an ATS and a recruiter search.",
        tip: "Fix the red Xs to ensure your resume is easily searchable by recruiters and parsed correctly by the ATS.",
        
        sections: [
          // Company-specific ATS information
          {
            label: "ATS Tip",
            fields: [
              {
                id: "companyInfoIncluded",
                value: false,
                tooltip: "Your resume doesn't mention Compas Pty Ltd. Including the company name can help tailor your resume for this specific opportunity.",
                label: "Assessment of whether job-specific company information is included for tailored ATS compatibility guidance",
                type: "boolean",
                weight: 5,
                actionLink: "Update scan information"
              }
            ]
          },
          
          // Contact information assessment
          {
            label: "Contact Information",
            fields: [
              {
                id: "physicalAddressPresent",
                value: true,
                tooltip: "You've provided your location as Sydney, Australia, which helps recruiters validate your location for job matches.",
                label: "Verification that physical address is present for geographic matching",
                type: "boolean",
                weight: 5
              },
              {
                id: "emailPresent",
                value: true,
                tooltip: "You've provided your email address, making it easy for recruiters to contact you.",
                label: "Confirmation that email address is properly included for contact purposes",
                type: "boolean",
                weight: 5
              },
              {
                id: "phonePresent",
                value: true,
                tooltip: "You've provided your phone number in a clear format.",
                label: "Verification that phone number is included in contact information",
                type: "boolean",
                weight: 5
              }
            ]
          },
          
          // Summary section assessment
          {
            label: "Summary",
            fields: [
              {
                id: "summaryPresent",
                value: true,
                tooltip: "Your resume includes a clear summary section that highlights your experience and unique value proposition.",
                label: "Assessment of whether resume contains a proper summary section that quickly communicates candidate value",
                type: "boolean",
                weight: 10
              }
            ]
          },
          
          // Section headings assessment
          {
            label: "Section Headings",
            fields: [
              {
                id: "educationSectionPresent",
                value: false,
                tooltip: "While your resume mentions 'BSci' in the header, there is no dedicated Education section. Adding a clearly labeled Education section would improve ATS parsing.",
                label: "Verification that resume contains a properly labeled Education section for ATS parsing",
                type: "boolean",
                weight: 10
              },
              {
                id: "workExperienceSectionPresent",
                value: true,
                tooltip: "Your resume includes a clearly labeled Experience section that showcases your work history.",
                label: "Confirmation that work experience section is properly included and labeled",
                type: "boolean",
                weight: 10
              }
            ]
          },
          
          // Job title match assessment
          {
            label: "Job Title Match",
            fields: [
              {
                id: "jobTitleIncluded",
                value: false,
                tooltip: "The job title 'Solution Architect' doesn't appear in your resume. Consider adding this exact title to improve your match rate for ATS searches.",
                label: "Assessment of whether the exact job title being applied for appears in the resume",
                type: "boolean",
                weight: 15,
                actionLink: "Update scan information"
              }
            ]
          },
          
          // Date formatting assessment
          {
            label: "Date Formatting",
            fields: [
              {
                id: "correctDateFormat",
                value: true,
                tooltip: "Your work experience dates follow the preferred 'YYYY - Present' format, which is ATS-friendly.",
                label: "Verification that work experience dates follow ATS-preferred formatting standards",
                type: "boolean",
                weight: 10
              }
            ]
          },
          
          // Education match assessment
          {
            label: "Education Match",
            fields: [
              {
                id: "meetsEducationRequirements",
                value: true,
                tooltip: "Your BSci degree is noted, which satisfies the implicit educational requirements for the position.",
                label: "Assessment of whether the candidate's education matches job requirements",
                type: "boolean",
                weight: 10
              }
            ]
          },
          
          // File type assessment
          {
            label: "File Type",
            fields: [
              {
                id: "isPdfFormat",
                value: true,
                tooltip: "Your resume is in PDF format, which is preferred by most ATS systems for consistent parsing.",
                label: "Verification that resume is in PDF format, which is optimal for ATS parsing",
                type: "boolean",
                weight: 5
              },
              {
                id: "noSpecialCharactersInFilename",
                value: true,
                tooltip: "Your file name doesn't contain special characters that could cause parsing errors.",
                label: "Confirmation that filename doesn't contain problematic special characters",
                type: "boolean",
                weight: 5
              },
              {
                id: "conciseFilename",
                value: true,
                tooltip: "Your resume filename appears concise and readable for easy identification.",
                label: "Verification that filename follows best practices for readability and conciseness",
                type: "boolean",
                weight: 5
              }
            ]
          }
        ]
      },
      
      // BEST PRACTICES CATEGORY
      bestPractices: {
        label: "Best Practices",
        description: "Resume best practices are standard conventions and formatting that make your resume professional and easy to read for both ATS systems and human recruiters.",
        tip: "Following these best practices can significantly improve the impact and effectiveness of your resume.",
        isImportant: true,
        
        sections: {
          // Length assessment
          length: {
            label: "Resume Length",
            fields: [
              {
                id: "appropriateLength",
                value: true,
                tooltip: "Your 2-page resume is appropriate for your 10 years of experience. It provides enough detail without overwhelming the reader.",
                label: "Assessment of whether resume length is appropriate for candidate's experience level",
                type: "boolean",
                weight: 10
              }
            ]
          },
          
          // Formatting assessment
          formatting: {
            label: "Formatting",
            fields: [
              {
                id: "consistentFormatting",
                value: true,
                tooltip: "Your resume maintains consistent formatting throughout, with clear section headings and consistent spacing.",
                label: "Evaluation of formatting consistency throughout the resume",
                type: "boolean",
                weight: 10
              },
              {
                id: "readableFonts",
                value: true,
                tooltip: "You've used standard, readable fonts that are compatible with ATS systems.",
                label: "Verification that resume uses standard, ATS-friendly fonts",
                type: "boolean",
                weight: 5
              },
              {
                id: "properMargins",
                value: true,
                tooltip: "Your resume has appropriate margins that balance content density with readability.",
                label: "Assessment of margin size and consistency",
                type: "boolean",
                weight: 5
              }
            ]
          },
          
          // Content quality assessment
          contentQuality: {
            label: "Content Quality",
            fields: [
              {
                id: "achievementFocused",
                value: true,
                tooltip: "Your resume effectively highlights achievements, especially in your Smith Family role where you describe specific accomplishments.",
                label: "Assessment of achievement-focused content versus duty descriptions",
                type: "boolean",
                weight: 15
              },
              {
                id: "actionVerbs",
                value: true,
                tooltip: "You consistently use strong action verbs such as 'lead,' 'deliver,' and 'engage' to begin descriptions of your accomplishments.",
                label: "Verification of action verb usage at the beginning of bullet points",
                type: "boolean",
                weight: 10
              },
              {
                id: "spellingGrammar",
                value: true,
                tooltip: "Your resume appears free from spelling and grammatical errors, demonstrating attention to detail.",
                label: "Assessment of spelling and grammatical correctness",
                type: "boolean",
                weight: 10
              }
            ]
          },
          
          // Customization assessment
          customization: {
            label: "Resume Customization",
            fields: [
              {
                id: "keywordsAligned",
                value: false,
                tooltip: "Your resume lacks some key terms from the job description like 'Solution Architect,' 'microservices,' and 'data analytics.' Adding these would improve ATS match.",
                label: "Assessment of keyword alignment with job description",
                type: "boolean",
                weight: 15
              },
              {
                id: "relevantExperienceHighlighted",
                value: true,
                tooltip: "Your most relevant experience is prominently featured, especially your architectural work at The Smith Family with Azure.",
                label: "Verification that most relevant experience is prominently featured",
                type: "boolean",
                weight: 15
              }
            ]
          }
        }
      },
      
      // HARD SKILLS CATEGORY
      hardSkills: {
        label: "Hard Skills",
        description: "Hard skills enable you to perform job-specific duties and responsibilities. You can learn hard skills in the classroom, training courses, and on the job. These skills are typically focused on teachable tasks and measurable abilities such as the use of tools, equipment, or software. Hard skills have a high impact on your match score.",
        tip: "Match the skills in your resume to the exact spelling in the job description. Prioritize skills that appear most frequently in the job description.",
        isImportant: true,
        scoreImpact: "HIGH SCORE IMPACT",
        
        sections: {
          skillsComparison: {
            label: "Skills Comparison",
            description: "Comparison of hard skills mentioned in the job description against those found in your resume.",
            fields: [
              {
                id: "architecture",
                jobDescriptionValue: 5,
                resumeValue: true,
                label: "System Architecture",
                tooltip: "Your resume shows architecture experience at The Smith Family, but could more explicitly highlight solution architecture capabilities.",
                type: "comparison"
              },
              {
                id: "cloudServices",
                jobDescriptionValue: 3,
                resumeValue: true,
                label: "Cloud Architecture",
                tooltip: "Your extensive Azure experience matches well with the cloud expertise required for this role.",
                type: "comparison"
              },
              {
                id: "microservices",
                jobDescriptionValue: 2,
                resumeValue: false,
                label: "Microservices",
                tooltip: "The job description specifically mentions microservices, but this term doesn't appear in your resume.",
                type: "comparison"
              },
              {
                id: "dataAnalytics",
                jobDescriptionValue: 2,
                resumeValue: false,
                label: "Data Analytics",
                tooltip: "Data analytics is mentioned as a key requirement, but your resume doesn't explicitly highlight this skill.",
                type: "comparison"
              },
              {
                id: "devOps",
                jobDescriptionValue: 2,
                resumeValue: true,
                label: "DevOps",
                tooltip: "Your experience with Azure DevOps and CI/CD pipelines aligns with the DevOps requirements.",
                type: "comparison"
              },
              {
                id: "systemIntegration",
                jobDescriptionValue: 3,
                resumeValue: true,
                label: "System Integration",
                tooltip: "Your experience integrating Azure services and CRM systems demonstrates system integration skills.",
                type: "comparison"
              }
            ]
          },
          
          highlightedSkills: {
            label: "Highlighted Skills",
            description: "Key hard skills from the job description that should be emphasized in your resume.",
            fields: [
              {
                id: "architecture_highlight",
                value: true,
                label: "Solution Architecture",
                tooltip: "This is the most critical skill for the role. Emphasize your experience designing and implementing complex technical solutions.",
                type: "boolean"
              },
              {
                id: "systemIntegration_highlight",
                value: true,
                label: "System Integration",
                tooltip: "The job requires expertise in integrating different systems. Your Azure experience is relevant but could be framed more explicitly as system integration.",
                type: "boolean"
              },
              {
                id: "dataAnalytics_highlight",
                value: false,
                label: "Data Analytics",
                tooltip: "This is mentioned as a key requirement. Consider highlighting any experience with data analysis, visualization, or business intelligence tools.",
                type: "boolean"
              }
            ]
          },
          
          skillGapAnalysis: {
            label: "Skill Gap Analysis",
            description: "Analysis of critical hard skills mentioned in the job description but missing from your resume.",
            fields: [
              {
                id: "microservices_gap",
                value: true,
                label: "Missing: Microservices Architecture",
                tooltip: "Add specific mentions of experience with microservices architecture. If you've worked with distributed systems or service-oriented architecture, highlight this.",
                type: "boolean",
                weight: 15
              },
              {
                id: "dataAnalytics_gap",
                value: true,
                label: "Missing: Data Analytics",
                tooltip: "Incorporate experience with data analytics, business intelligence tools, or data-driven decision making. Your Application Insights experience could be relevant here.",
                type: "boolean",
                weight: 15
              },
              {
                id: "solutionDesign_gap",
                value: true,
                label: "Missing: Solution Design Methodologies",
                tooltip: "Explicitly mention modern design methodologies you've used, particularly in the context of solution architecture.",
                type: "boolean",
                weight: 10
              }
            ]
          }
        }
      },
      
      // SOFT SKILLS CATEGORY
      softSkills: {
        label: "Soft Skills",
        description: "Soft skills are your traits and abilities that are not unique to any job. Your soft skills are part of your personality, and can be learned also. These skills are the traits that typically make you a good employee for any company such as time management and communication. Soft skills have a medium impact on your match score.",
        tip: "Prioritize hard skills in your resume to get interviews, and then showcase your soft skills in the interview to get jobs.",
        isImportant: true,
        scoreImpact: "MEDIUM SCORE IMPACT",
        
        sections: {
          skillsComparison: {
            label: "Skills Comparison",
            description: "Comparison of soft skills mentioned in the job description against those found in your resume.",
            fields: [
              {
                id: "technicalLeadership",
                jobDescriptionValue: 3,
                resumeValue: true,
                label: "Technical Leadership",
                tooltip: "Your Tech Lead role and cross-functional team leadership experience directly matches this requirement.",
                type: "comparison"
              },
              {
                id: "stakeholderCommunication",
                jobDescriptionValue: 2,
                resumeValue: true,
                label: "Stakeholder Communication",
                tooltip: "Your experience engaging stakeholders to get approval for features demonstrates this skill effectively.",
                type: "comparison"
              },
              {
                id: "strategicThinking",
                jobDescriptionValue: 2,
                resumeValue: true,
                label: "Strategic Thinking",
                tooltip: "Your resume shows evidence of strategic thinking in how you approach technical solutions and transformational change.",
                type: "comparison"
              },
              {
                id: "technicalCommunication",
                jobDescriptionValue: 2,
                resumeValue: true,
                label: "Explaining Complex Ideas",
                tooltip: "Your experience documenting technical solutions and creating dashboards for business stakeholders demonstrates this skill.",
                type: "comparison"
              }
            ]
          },
          
          highlightedSkills: {
            label: "Highlighted Skills",
            description: "Key soft skills from the job description that should be demonstrated in your resume.",
            fields: [
              {
                id: "technicalLeadership_highlight",
                value: true,
                label: "Technical Leadership",
                tooltip: "This is highlighted well through your Tech Lead role and descriptions of leading cross-functional teams.",
                type: "boolean"
              },
              {
                id: "communicationSkills_highlight",
                value: true,
                label: "Communication Skills",
                tooltip: "Your resume demonstrates your ability to communicate with both technical teams and business stakeholders through documentation and engagement.",
                type: "boolean"
              }
            ]
          },
          
          demonstratedSkills: {
            label: "Demonstrated Skills",
            description: "Soft skills that are effectively demonstrated through achievements in your resume.",
            fields: [
              {
                id: "technicalLeadership_demonstrated",
                value: true,
                label: "Technical Leadership (Demonstrated)",
                tooltip: "Clearly demonstrated through your role as Tech Lead and ownership of technical solutions at The Smith Family.",
                type: "boolean"
              },
              {
                id: "stakeholderManagement_demonstrated",
                value: true,
                label: "Stakeholder Management (Demonstrated)",
                tooltip: "Well-demonstrated through your description of engaging stakeholders for feature approvals and creating business-friendly dashboards.",
                type: "boolean"
              },
              {
                id: "crossFunctionalCollaboration_demonstrated",
                value: true,
                label: "Cross-Functional Collaboration (Demonstrated)",
                tooltip: "Effectively shown through your experience leading cross-functional teams and bringing technical teams and business stakeholders together.",
                type: "boolean"
              }
            ]
          }
        }
      }
    }
  };