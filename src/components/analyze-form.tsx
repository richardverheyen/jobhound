"use client";

import { useState, useRef, FormEvent } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";

interface AnalyzeFormProps {
  credits: number;
  apiKey: string;
}

export default function AnalyzeForm({ credits, apiKey }: AnalyzeFormProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      if (droppedFile.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return;
      }
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!jobDescription.trim()) {
      setError("Please enter a job description");
      return;
    }

    if (!file) {
      setError("Please upload a resume");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("jobPosting", jobDescription);
      formData.append("resume", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze resume");
      }

      // Get the response text directly
      const responseText = await response.text();

      try {
        // Try to parse the response as JSON
        const parsedResult = JSON.parse(responseText);
        setResult(parsedResult);
      } catch (e) {
        console.error("Error parsing response:", e);
        setError("Failed to parse analysis results. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while analyzing the resume");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="jobDescription" className="text-sm font-medium">
            Job Description
          </label>
          <Textarea
            id="jobDescription"
            placeholder="Paste the full job description here..."
            className="min-h-[200px]"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="resumeUpload" className="text-sm font-medium">
            Resume (PDF)
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${fileName ? "border-green-300 bg-green-50" : "border-gray-300"}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {fileName ? (
              <div className="flex flex-col items-center">
                <p className="text-sm font-medium mb-2">{fileName}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setFileName("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={isLoading}
                >
                  Change File
                </Button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your resume, or click to browse
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF files only, max 5MB
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              id="resumeUpload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={credits <= 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : credits > 0 ? (
              "Analyze Resume"
            ) : (
              "Purchase Credits to Analyze"
            )}
          </Button>
          {credits <= 0 && (
            <p className="text-sm text-center text-muted-foreground mt-2">
              You need to purchase more credits to perform an analysis
            </p>
          )}
        </div>
      </form>

      {/* Results Section */}
      {result && (
        <Card className="mt-8 border-blue-200">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>AI-powered resume match analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Match */}
            {result.overallMatch && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Overall Match</h3>
                <p>{result.overallMatch}</p>
              </div>
            )}

            {/* Hard Skills */}
            {result.hardSkills && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Hard Skills</h3>
                <p>{result.hardSkills}</p>
              </div>
            )}

            {/* Soft Skills */}
            {result.softSkills && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Soft Skills</h3>
                <p>{result.softSkills}</p>
              </div>
            )}

            {/* Experience Match */}
            {result.experienceMatch && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Experience Match</h3>
                <p>{result.experienceMatch}</p>
              </div>
            )}

            {/* Qualifications */}
            {result.qualifications && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Qualifications</h3>
                <p>{result.qualifications}</p>
              </div>
            )}

            {/* Missing Keywords */}
            {result.missingKeywords && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Missing Keywords</h3>
                <p>{result.missingKeywords}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
