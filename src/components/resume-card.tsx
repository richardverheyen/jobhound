"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ResumeCardProps {
  resume: {
    id: string;
    filename: string;
    created_at: string;
    scan_count: number;
    file_url?: string;
  };
}

export default function ResumeCard({ resume }: ResumeCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewPdf = () => {
    if (resume.file_url) {
      window.open(resume.file_url, "_blank");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-32 w-32 bg-blue-50 rounded-full flex items-center justify-center mb-2">
            <span className="text-4xl text-blue-500 font-bold">PDF</span>
          </div>
          <h3 className="font-medium text-lg truncate w-full">
            {resume.filename}
          </h3>
          <div className="text-sm text-muted-foreground">
            Uploaded on {formatDate(resume.created_at)}
          </div>
          <div className="text-sm">
            {resume.scan_count} {resume.scan_count === 1 ? "scan" : "scans"}
          </div>
          {resume.file_url && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleViewPdf}
            >
              View PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
