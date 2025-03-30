'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Resume } from '@/types';

// Dynamically import the PDFPreviewCard component to prevent SSR issues
const PDFPreviewCard = dynamic(
  () => import('./PDFPreviewCard'),
  { ssr: false, loading: () => <PDFPreviewSkeleton /> }
);

interface PDFViewerProps {
  resume: Resume;
  onView: () => void;
  showTwoPages?: boolean;
}

function PDFPreviewSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div 
        className="bg-gray-100 dark:bg-gray-700" 
        style={{ aspectRatio: '16/9' }}
      >
        <div className="h-full w-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
      </div>
    </div>
  );
}

export default function PDFViewer({ resume, onView, showTwoPages = false }: PDFViewerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <PDFPreviewSkeleton />;
  }

  return (
    <PDFPreviewCard 
      resume={resume}
      onView={onView}
      showTwoPages={showTwoPages}
    />
  );
} 