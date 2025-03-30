'use client';

import { useState, useEffect, useRef } from 'react';
import { Resume } from '@/types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set the worker source directly to our static file
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const [fallbackFailed, setFallbackFailed] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle iframe load errors
  useEffect(() => {
    if (useFallback && iframeRef.current) {
      const handleIframeError = () => {
        console.error('Iframe fallback failed too');
        setFallbackFailed(true);
      };

      iframeRef.current.addEventListener('error', handleIframeError);
      
      // Set a timeout to check if the iframe loaded
      const timeout = setTimeout(() => {
        // If we still don't have content after 5 seconds, fallback to static display
        if (iframeRef.current?.contentDocument?.body?.innerHTML === '') {
          handleIframeError();
        }
      }, 5000);

      return () => {
        iframeRef.current?.removeEventListener('error', handleIframeError);
        clearTimeout(timeout);
      };
    }
  }, [useFallback]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setError('Could not load PDF document');
    setLoading(false);
    // Try the fallback approach after PDF.js fails
    setUseFallback(true);
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
        {loading && !useFallback && !fallbackFailed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && !useFallback && !fallbackFailed && (
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <p className="text-red-500 mb-2">{error}</p>
            <p className="text-sm text-gray-500">Trying alternative rendering method...</p>
          </div>
        )}
        
        {!useFallback && !fallbackFailed ? (
          <div className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
            <Document
              file={resume.file_url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              options={{ 
                cMapUrl: '/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: '/standard_fonts/'
              }}
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
        ) : useFallback && !fallbackFailed ? (
          // Fallback to iframe for better compatibility
          <div className="h-full w-full overflow-hidden">
            <iframe 
              ref={iframeRef}
              src={resume.file_url} 
              className="w-full h-full"
              style={{ 
                transform: 'scale(1.2)',
                transformOrigin: 'top center',
                pointerEvents: 'none'
              }}
              title="Resume Preview"
            />
          </div>
        ) : (
          // Static fallback with document icon when all else fails
          <div className="h-full w-full flex flex-col items-center justify-center">
            <svg className="h-16 w-16 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">PDF preview not available</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Click View to open the document</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Card Footer */}
      <div className="p-4 bg-white dark:bg-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {resume.filename || 'Unnamed Resume'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {numPages && !useFallback && !fallbackFailed ? `${numPages} page${numPages > 1 ? 's' : ''}` : ''} 
            {numPages && !useFallback && !fallbackFailed ? ' • ' : ''}
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