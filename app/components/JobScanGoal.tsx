'use client';

import { useState } from 'react';
import { supabase } from '@/supabase/client';
import { User } from '@/types';

interface JobScanGoalProps {
  user: User;
  jobsFoundToday: number;
  onGoalUpdated?: () => void;
}

export default function JobScanGoal({ user, jobsFoundToday, onGoalUpdated }: JobScanGoalProps) {
  const [jobGoal, setJobGoal] = useState<number>(user?.job_search_goal || 5);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Calculate progress
  const progress = Math.min(100, Math.round((jobsFoundToday / jobGoal) * 100));

  const handleGoalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ job_search_goal: jobGoal })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating job goal:', error);
      } else if (onGoalUpdated) {
        onGoalUpdated();
      }
    } catch (error) {
      console.error('Error updating job goal:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Job Search Goal</h2>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Progress: {jobsFoundToday} of {jobGoal} jobs</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <form onSubmit={handleGoalUpdate} className="flex items-center space-x-2 mb-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">Adjust goal:</span>
        <input 
          type="number" 
          min="1" 
          value={jobGoal}
          onChange={(e) => setJobGoal(parseInt(e.target.value) || 5)}
          className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button 
          type="submit"
          disabled={isUpdating}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isUpdating ? 'Saving...' : 'Save'}
        </button>
      </form>
      
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Setting daily job search goals helps you stay organized and motivated. 
        This goal represents how many new potential job listings you want to find each day - not 
        necessarily how many you'll apply to. Finding quality matches is the first step to successful applications.
      </p>
    </div>
  );
} 