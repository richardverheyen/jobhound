'use client';

import { useState, useEffect, useRef } from 'react';
import { Resume } from '@/types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface PDFPreviewCardProps {
  resume: Resume;
  onView: () => void;
  showTwoPages?: boolean;
}

export default function PDFPreviewCard({ 
  resume, 
  onView,
  showTwoPages = false 
}: PDFPreviewCardProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize PDF.js worker
  useEffect(() => {
    // Only set the worker source if it hasn't been set already
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setError('Could not load PDF document');
    setLoading(false);
  }

  if (!resume.file_url) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No PDF URL available</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {resume.filename || 'Unnamed Resume'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Uploaded {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : 'Unknown date'}
            </p>
          </div>
          <button
            onClick={onView}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* PDF Preview Area */}
      <div 
        className="relative bg-gray-100 dark:bg-gray-700 overflow-hidden" 
        style={{ aspectRatio: '16/9' }}
        ref={containerRef}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        )}
        
        <div className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
          <Document
            file={resume.file_url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
          >
            {showTwoPages ? (
              <div className="flex">
                <div className="w-1/2 pr-1">
                  <Page 
                    pageNumber={1} 
                    width={containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
                {numPages && numPages > 1 && (
                  <div className="w-1/2 pl-1">
                    <Page 
                      pageNumber={2} 
                      width={containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : undefined}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                )}
              </div>
            ) : (
              <Page 
                pageNumber={1} 
                width={containerRef.current?.clientWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            )}
          </Document>
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="p-4 bg-white dark:bg-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {resume.filename || 'Unnamed Resume'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {numPages ? `${numPages} page${numPages > 1 ? 's' : ''}` : ''} • 
            Uploaded {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : 'Unknown date'}
          </p>
        </div>
        <button
          onClick={onView}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View
        </button>
      </div>
    </div>
  );
} 