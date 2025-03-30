'use client';

import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number; // Size in pixels
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 4,
  color = 'currentColor',
  backgroundColor = '#e5e7eb',
  showPercentage = true,
  className = '',
}: ProgressRingProps) {
  // Ensure progress is between 0-100
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;
  
  // Determine color based on score if not explicitly provided
  const getScoreColor = () => {
    if (color !== 'currentColor') return color;
    
    if (normalizedProgress >= 90) return '#10b981'; // green
    if (normalizedProgress >= 50) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };
  
  const ringColor = getScoreColor();
  
  // Determine font size based on ring size
  const getFontSize = () => {
    if (size <= 30) return '8px'; 
    if (size <= 40) return '11px';
    if (size <= 60) return '14px';
    return '16px';
  };
  
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="transition-all duration-300 ease-in-out"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <span className="font-medium" style={{ fontSize: getFontSize(), color: "white" }}>
            {Math.round(normalizedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
} 