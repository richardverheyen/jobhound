'use client';

import React from 'react';
import JobScanView from './JobScanView';
import { JobScan } from '@/types';

// Sample data for demonstration purposes
const sampleScanData: JobScan = {
  id: 'demo-scan-1',
  job_id: 'demo-job-1',
  resume_id: 'demo-resume-1',
  resume_filename: 'sample_resume.pdf',
  status: 'completed',
  match_score: 88,
  created_at: new Date().toISOString(),
  results: [
    {
      c: 90,
      e: "The resume includes the address: Sydney, Australia.",
      p: "physicalAddressPresent",
      v: true,
      id: "physicalAddressPresent"
    },
    {
      c: 100,
      e: "The resume includes a valid email address: richard.verheyen@gmail.com.",
      p: "emailPresent",
      v: true,
      id: "emailPresent"
    },
    {
      c: 100,
      e: "The resume includes a phone number in a standard format: 0499 796 415.",
      p: "phonePresent",
      v: true,
      id: "phonePresent"
    },
    {
      c: 100,
      e: "The resume contains a summary section that highlights the candidate's experience and value proposition.",
      p: "summaryPresent",
      v: true,
      id: "summaryPresent"
    },
    {
      c: 0,
      e: "The resume does not contain an education section.",
      p: "educationSectionPresent",
      v: false,
      id: "educationSectionPresent"
    },
    {
      c: 100,
      e: "The resume has an 'Experience' section.",
      p: "workExperienceSectionPresent",
      v: true,
      id: "workExperienceSectionPresent"
    },
    {
      c: 0,
      e: "The resume does not include the exact job title 'Solution Architect'.",
      p: "jobTitleIncluded",
      v: false,
      id: "jobTitleIncluded"
    },
    {
      c: 100,
      e: "The resume uses the date format Month YYYY.",
      p: "correctDateFormat",
      v: true,
      id: "correctDateFormat"
    },
    {
      c: 0,
      e: "The resume does not contain an education section, so it is not possible to determine if the candidate meets the education requirements.",
      p: "meetsEducationRequirements",
      v: false,
      id: "meetsEducationRequirements"
    },
    {
      c: 100,
      e: "The resume is in PDF format.",
      p: "isPdfFormat",
      v: true,
      id: "isPdfFormat"
    },
    {
      c: 100,
      e: "The filename does not contain any special characters.",
      p: "noSpecialCharactersInFilename",
      v: true,
      id: "noSpecialCharactersInFilename"
    },
    {
      c: 100,
      e: "The filename is concise and readable.",
      p: "conciseFilename",
      v: true,
      id: "conciseFilename"
    },
    {
      c: 100,
      e: "The resume is two pages long, which is appropriate for the candidate's experience level.",
      p: "appropriateLength",
      v: true,
      id: "appropriateLength"
    },
    {
      c: 90,
      e: "The resume appears to have consistent formatting.",
      p: "consistentFormatting",
      v: true,
      id: "consistentFormatting"
    },
    {
      c: 100,
      e: "The resume uses standard, ATS-friendly fonts.",
      p: "readableFonts",
      v: true,
      id: "readableFonts"
    },
    {
      c: 90,
      e: "The resume appears to have appropriate and consistent margins.",
      p: "properMargins",
      v: true,
      id: "properMargins"
    },
    {
      c: 80,
      e: "The resume includes achievements and results.",
      p: "achievementFocused",
      v: true,
      id: "achievementFocused"
    },
    {
      c: 100,
      e: "The resume uses action verbs at the beginning of bullet points.",
      p: "actionVerbs",
      v: true,
      id: "actionVerbs"
    },
    {
      c: 95,
      e: "The resume appears to be free of spelling and grammatical errors.",
      p: "spellingGrammar",
      v: true,
      id: "spellingGrammar"
    },
    {
      c: 80,
      e: "The resume incorporates relevant keywords from the job description.",
      p: "keywordsAligned",
      v: true,
      id: "keywordsAligned"
    },
    {
      c: 90,
      e: "The resume highlights relevant experience.",
      p: "relevantExperienceHighlighted",
      v: true,
      id: "relevantExperienceHighlighted"
    },
    {
      c: 90,
      e: "React is mentioned in the resume.",
      l: "React",
      p: "hardSkills",
      em: true,
      id: "react-skill",
      rm: false,
      sm: false,
      syn: []
    },
    {
      c: 90,
      e: "Vue is mentioned in the resume.",
      l: "Vue",
      p: "hardSkills",
      em: true,
      id: "vue-skill",
      rm: false,
      sm: false,
      syn: []
    },
    {
      c: 90,
      e: "Node is mentioned in the resume.",
      l: "Node",
      p: "hardSkills",
      em: true,
      id: "node-skill",
      rm: false,
      sm: false,
      syn: []
    },
    {
      c: 90,
      e: "Javascript is mentioned in the resume.",
      l: "Javascript",
      p: "hardSkills",
      em: true,
      id: "javascript-skill",
      rm: false,
      sm: false,
      syn: []
    },
    {
      c: 90,
      e: "Typescript is mentioned in the resume.",
      l: "Typescript",
      p: "hardSkills",
      em: true,
      id: "typescript-skill",
      rm: false,
      sm: false,
      syn: []
    },
    {
      c: 90,
      e: "Python is mentioned in the resume.",
      l: "Python",
      p: "hardSkills",
      em: true,
      id: "python-skill",
      rm: false,
      sm: false,
      syn: []
    },
    {
      c: 90,
      e: "Stakeholder engagement is mentioned in the resume.",
      l: "Stakeholder engagement",
      p: "softSkills",
      em: true,
      id: "stakeholder-skill",
      rm: false,
      sm: false,
      syn: []
    },
    {
      c: 90,
      e: "Cross-functional team leadership is mentioned in the resume.",
      l: "Cross-functional team leadership",
      p: "softSkills",
      em: true,
      id: "leadership-skill",
      rm: false,
      sm: false,
      syn: []
    }
  ]
};

export default function JobScanViewDemo() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">JobScanView Component Demo</h1>
      <JobScanView scan={sampleScanData} />
    </div>
  );
} 