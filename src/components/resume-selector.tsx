"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabase";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, Upload } from "lucide-react";
import ResumeUpload from "./resume-upload";

interface ResumeSelectorProps {
  userId: string;
  onSelect: (resumeId: string, filename: string) => void;
}

export default function ResumeSelector({
  userId,
  onSelect,
}: ResumeSelectorProps) {
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const fetchResumes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setResumes(data || []);
      } catch (error) {
        console.error("Error fetching resumes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [userId]);

  const handleSelect = (resumeId: string, filename: string) => {
    setSelectedResumeId(resumeId);
    onSelect(resumeId, filename);
  };

  const handleUploadComplete = (resumeId: string, filename: string) => {
    // Add the new resume to the list
    setResumes((prev) => [
      {
        id: resumeId,
        filename: filename,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    // Select the newly uploaded resume
    handleSelect(resumeId, filename);
    // Hide the upload form
    setShowUpload(false);
  };

  if (loading) {
    return <div className="text-center py-4">Loading resumes...</div>;
  }

  return (
    <div className="space-y-4">
      {showUpload ? (
        <div className="space-y-4">
          <ResumeUpload
            onUploadComplete={handleUploadComplete}
            userId={userId}
          />
          <Button
            variant="outline"
            onClick={() => setShowUpload(false)}
            className="w-full"
          >
            Cancel Upload
          </Button>
        </div>
      ) : (
        <>
          {resumes.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {resumes.map((resume) => (
                  <Card
                    key={resume.id}
                    className={`cursor-pointer transition-all ${selectedResumeId === resume.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"}`}
                    onClick={() => handleSelect(resume.id, resume.filename)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium truncate">
                          {resume.filename}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(resume.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowUpload(true)}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload New Resume
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                No resumes found. Upload your first resume to get started.
              </p>
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Resume
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
