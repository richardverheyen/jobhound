'use client';

import React, { useState, useEffect } from 'react';
import { JobScan } from '@/types';
import ProgressRing from './ProgressRing';
import { fields } from '@/app/api/create-scan/v1-fields';

interface JobScanViewProps {
  scan: JobScan;
}

// Helper function to group fields by section
const groupFieldsBySection = (results: any[], fieldDefinitions: any[]) => {
  // Create a map of field definitions for quick lookup
  const fieldDefinitionsMap = fieldDefinitions.reduce((acc, field) => {
    acc[field.id] = field;
    return acc;
  }, {} as Record<string, any>);

  // Group results by category and section
  const categorySections: Record<string, Record<string, any[]>> = {};
  
  results.forEach(result => {
    // Get the parent field ID - either directly from p or from the result's id
    const fieldId = result.p || result.id;
    const fieldDef = fieldDefinitionsMap[fieldId];
    
    if (!fieldDef) return;
    
    const { category, section } = fieldDef.fieldContext;
    
    // Initialize category and section if they don't exist
    if (!categorySections[category]) {
      categorySections[category] = {};
    }
    if (!categorySections[category][section]) {
      categorySections[category][section] = [];
    }
    
    // Add the result with its field context
    categorySections[category][section].push({
      ...result,
      fieldContext: fieldDef.fieldContext
    });
  });
  
  return categorySections;
};

export default function JobScanView({ scan }: JobScanViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [groupedFields, setGroupedFields] = useState<any>(null);
  
  useEffect(() => {
    if (scan.status === 'completed' && scan.results && Array.isArray(scan.results)) {
      setGroupedFields(groupFieldsBySection(scan.results, fields));
    }
  }, [scan]);
  
  // If the scan isn't completed, don't render the detailed view
  if (scan.status !== 'completed' || !scan.results) {
    return (
      <div className="p-4 text-center">
        {scan.status === 'pending' && (
          <div className="flex flex-col items-center justify-center py-6">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">Analyzing your resume against this job...</p>
          </div>
        )}
        
        {scan.status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-6">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing results...</p>
          </div>
        )}
        
        {scan.status === 'error' && (
          <div className="text-center py-6">
            <svg className="h-8 w-8 text-red-500 mb-3 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">
              {scan.error_message || 'An error occurred during scan processing'}
            </p>
          </div>
        )}
      </div>
    );
  }
  
  if (!groupedFields) return null;
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Toggle item expansion
  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
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
      hardSkills: { score: 0, total: 0 },
      softSkills: { score: 0, total: 0 }
    };

    // Process each result item
    results.forEach(item => {
      if (item.p === 'hardSkills') {
        categories.hardSkills.total++;
        if (item.em || item.sm || item.rm) {
          categories.hardSkills.score++;
        }
      } 
      else if (item.p === 'softSkills') {
        categories.softSkills.total++;
        if (item.em || item.sm || item.rm) {
          categories.softSkills.score++;
        }
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
      overall: scan.match_score || 0
    };
  };

  const scores = calculateCategoryScores();
  if (!scores) return null;

  // Helper function to determine color based on score
  const getRingColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const renderCategoryCard = (category: string, title: string, description: string, score: number) => (
    <div 
      className="bg-[#2a3749] rounded-lg p-4 cursor-pointer hover:bg-[#32404f] transition"
      onClick={() => toggleSection(category)}
    >
      <div className="flex flex-col items-center mb-2">
        <ProgressRing
          progress={score}
          size={60}
          strokeWidth={5}
          color={getRingColor(score)}
          backgroundColor="rgba(255,255,255,0.1)"
          showPercentage={true}
          className="text-white mb-2"
        />
        <h3 className="text-base font-medium">{title}</h3>
      </div>
      <p className="text-sm text-gray-300 text-center">{description}</p>
    </div>
  );

  return (
    <div className="bg-[#1e2837] text-white overflow-hidden">
      {/* Header with overall score */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-medium">Resume Analysis</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">Overall Score</span>
          <ProgressRing
            progress={scores.overall}
            size={40}
            strokeWidth={3}
            color={getRingColor(scores.overall)}
            backgroundColor="rgba(255,255,255,0.1)"
            showPercentage={true}
            className="text-white"
          />
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderCategoryCard('searchability', 'Searchability', 'ATS compatibility score', scores.searchability)}
        {renderCategoryCard('bestPractices', 'Best Practices', 'Resume format & quality', scores.bestPractices)}
        {renderCategoryCard('hardSkills', 'Hard Skills', 'Technical skills match', scores.hardSkills)}
        {renderCategoryCard('softSkills', 'Soft Skills', 'Interpersonal skills match', scores.softSkills)}
      </div>

      {/* Expanded sections */}
      {Object.entries(groupedFields).map(([category, sections]) => 
        expandedSections[category] && (
          <div key={category} className="p-4 border-t border-[#3a4658]">
            <h3 className="text-lg font-medium mb-4">{category.charAt(0).toUpperCase() + category.slice(1)} Details</h3>
            
            {/* Sections */}
            {Object.entries(sections).map(([sectionName, items]) => (
              <div key={sectionName} className="mb-6">
                <h4 className="text-sm font-medium uppercase text-gray-400 mb-2">{sectionName}</h4>
                
                <div className="space-y-3">
                  {/* Items */}
                  {Array.isArray(items) && items.map((item, index) => {
                    const isSkill = item.p === 'hardSkills' || item.p === 'softSkills';
                    const passed = isSkill ? (item.em || item.sm || item.rm) : item.v;
                    const itemId = `${category}-${sectionName}-${index}`;
                    
                    return (
                      <div 
                        key={itemId} 
                        className="cursor-pointer"
                        onClick={() => toggleItem(itemId)}
                      >
                        <div className="flex items-start p-3 bg-[#2a3749] rounded-lg">
                          <div className="mr-3 mt-0.5">
                            {passed ? (
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium flex items-center justify-between">
                              <span>
                                {isSkill 
                                  ? item.l 
                                  : item.fieldContext?.label || item.id.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                              </span>
                              <svg className={`w-4 h-4 transition-transform ${expandedItems[itemId] ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </h4>
                            
                            {expandedItems[itemId] && (
                              <div className="mt-2 space-y-2">
                                <p className="text-xs text-gray-300">{item.e}</p>
                                {item.c && (
                                  <p className="text-xs text-gray-400">Confidence: {Math.round(item.c * 100)}%</p>
                                )}
                                {isSkill && item.syn && item.syn.length > 0 && (
                                  <p className="text-xs text-gray-400">
                                    Synonyms: {item.syn.join(', ')}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
} 