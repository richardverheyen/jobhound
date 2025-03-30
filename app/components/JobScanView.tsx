'use client';

import React, { useState } from 'react';
import { JobScan } from '@/types';
import ProgressRing from './ProgressRing';

interface JobScanViewProps {
  scan: JobScan;
}

export default function JobScanView({ scan }: JobScanViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate category scores from results
  const calculateCategoryScores = () => {
    if (!scan.results) return null;
    
    const results = Array.isArray(scan.results) ? scan.results : [];
    
    // Initialize categories
    const categories = {
      searchability: { score: 0, total: 0 },
      bestPractices: { score: 0, total: 0 },
      hardSkills: { score: 0, total: 0, items: [] as any[] },
      softSkills: { score: 0, total: 0, items: [] as any[] }
    };

    // Process each result item
    results.forEach(item => {
      if (item.p === 'hardSkills') {
        categories.hardSkills.total++;
        if (item.em || item.sm || item.rm) {
          categories.hardSkills.score++;
        }
        categories.hardSkills.items.push(item);
      } 
      else if (item.p === 'softSkills') {
        categories.softSkills.total++;
        if (item.em || item.sm || item.rm) {
          categories.softSkills.score++;
        }
        categories.softSkills.items.push(item);
      }
      else if (item.id.startsWith('searchability') || 
               ['emailPresent', 'phonePresent', 'physicalAddressPresent', 'educationSectionPresent', 
                'workExperienceSectionPresent', 'jobTitleIncluded', 'correctDateFormat', 
                'meetsEducationRequirements', 'isPdfFormat', 'noSpecialCharactersInFilename', 
                'conciseFilename'].includes(item.id)) {
        categories.searchability.total++;
        if (item.v) categories.searchability.score++;
      }
      else {
        // Assume any other fields are best practices
        categories.bestPractices.total++;
        if (item.v) categories.bestPractices.score++;
      }
    });

    // Calculate percentages
    return {
      searchability: categories.searchability.total > 0 
        ? Math.round((categories.searchability.score / categories.searchability.total) * 100) 
        : 0,
      bestPractices: categories.bestPractices.total > 0 
        ? Math.round((categories.bestPractices.score / categories.bestPractices.total) * 100) 
        : 0,
      hardSkills: categories.hardSkills.total > 0 
        ? Math.round((categories.hardSkills.score / categories.hardSkills.total) * 100) 
        : 0,
      softSkills: categories.softSkills.total > 0 
        ? Math.round((categories.softSkills.score / categories.softSkills.total) * 100) 
        : 0,
      overall: scan.match_score || 0,
      hardSkillsItems: categories.hardSkills.items,
      softSkillsItems: categories.softSkills.items
    };
  };

  const scores = calculateCategoryScores();
  if (!scores) return null;

  // Helper function to determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRingColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* Header with overall score */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Resume Analysis</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Overall Score</span>
            <ProgressRing
              progress={scores.overall}
              size={60}
              strokeWidth={6}
              color={getRingColor(scores.overall)}
              backgroundColor="#e5e7eb"
              showPercentage={true}
            />
          </div>
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Searchability */}
          <div 
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            onClick={() => toggleSection('searchability')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Searchability</h3>
              <ProgressRing
                progress={scores.searchability}
                size={50}
                strokeWidth={5}
                color={getRingColor(scores.searchability)}
                backgroundColor="#e5e7eb"
                showPercentage={true}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">ATS compatibility score</p>
          </div>

          {/* Best Practices */}
          <div 
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            onClick={() => toggleSection('bestPractices')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Best Practices</h3>
              <ProgressRing
                progress={scores.bestPractices}
                size={50}
                strokeWidth={5}
                color={getRingColor(scores.bestPractices)}
                backgroundColor="#e5e7eb"
                showPercentage={true}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Resume format & quality</p>
          </div>

          {/* Hard Skills */}
          <div 
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            onClick={() => toggleSection('hardSkills')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Hard Skills</h3>
              <ProgressRing
                progress={scores.hardSkills}
                size={50}
                strokeWidth={5}
                color={getRingColor(scores.hardSkills)}
                backgroundColor="#e5e7eb"
                showPercentage={true}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Technical skills match</p>
          </div>

          {/* Soft Skills */}
          <div 
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            onClick={() => toggleSection('softSkills')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Soft Skills</h3>
              <ProgressRing
                progress={scores.softSkills}
                size={50}
                strokeWidth={5}
                color={getRingColor(scores.softSkills)}
                backgroundColor="#e5e7eb"
                showPercentage={true}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Interpersonal skills match</p>
          </div>
        </div>
      </div>

      {/* Expanded sections */}
      {expandedSections.hardSkills && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Hard Skills Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scores.hardSkillsItems.map((skill, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="mr-3">
                  {skill.em || skill.sm || skill.rm ? (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{skill.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedSections.softSkills && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Soft Skills Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scores.softSkillsItems.map((skill, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="mr-3">
                  {skill.em || skill.sm || skill.rm ? (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{skill.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedSections.searchability && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Searchability Details</h3>
          <div className="space-y-3">
            {scan.results && Array.isArray(scan.results) && scan.results
              .filter(item => item.id.startsWith('searchability') || 
                ['emailPresent', 'phonePresent', 'physicalAddressPresent', 'educationSectionPresent', 
                 'workExperienceSectionPresent', 'jobTitleIncluded', 'correctDateFormat', 
                 'meetsEducationRequirements', 'isPdfFormat', 'noSpecialCharactersInFilename', 
                 'conciseFilename'].includes(item.id))
              .map((item, index) => (
                <div key={index} className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="mr-3 mt-0.5">
                    {item.v ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.id.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).replace('Present', '')}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.e}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {expandedSections.bestPractices && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Best Practices Details</h3>
          <div className="space-y-3">
            {scan.results && Array.isArray(scan.results) && scan.results
              .filter(item => !item.id.startsWith('searchability') && 
                !['emailPresent', 'phonePresent', 'physicalAddressPresent', 'educationSectionPresent', 
                 'workExperienceSectionPresent', 'jobTitleIncluded', 'correctDateFormat', 
                 'meetsEducationRequirements', 'isPdfFormat', 'noSpecialCharactersInFilename', 
                 'conciseFilename'].includes(item.id) && 
                item.p !== 'hardSkills' && item.p !== 'softSkills')
              .map((item, index) => (
                <div key={index} className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="mr-3 mt-0.5">
                    {item.v ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.id.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.e}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
} 