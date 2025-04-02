'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';

// Import only the core styles
import '@react-pdf-viewer/core/lib/styles/index.css';

interface PDFViewerProps {
  fileUrl: string;
  onClick?: () => void;
  isFullViewer?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, onClick, isFullViewer = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Update container width when component mounts or window resizes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    // Initial measurement
    updateWidth();
    
    // Create ResizeObserver to monitor container size changes
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);
    
    // Clean up
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {containerWidth > 0 && (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <Viewer 
            fileUrl={fileUrl} 
            defaultScale={1.0}
            pageLayout={{
              transformSize: ({ size }) => ({
                width: containerWidth,
                height: size.height * (containerWidth / size.width)
              })
            }}
            renderError={(error) => (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <svg className="h-10 w-10 text-red-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Unable to load the resume preview. 
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {error.message}
                </p>
              </div>
            )}
            renderLoader={(percentages) => (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loading resume... {Math.round(percentages)}%
                </p>
              </div>
            )}
          />
        </Worker>
      )}
    </div>
  );
};

export default PDFViewer;