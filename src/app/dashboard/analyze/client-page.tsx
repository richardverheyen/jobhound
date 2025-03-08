"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";
import AnalyzeForm from "@/components/analyze-form";

interface ClientPageProps {
  credits: number;
  apiKey: string;
}

export default function ClientPage({ credits, apiKey }: ClientPageProps) {
  return (
    <main className="w-full">
      <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header Section */}
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Analyze Resume</h1>
          <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
            <InfoIcon size="14" />
            <span>
              Upload a resume and job description to analyze the match
            </span>
          </div>
        </header>

        {/* Credits Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Available Credits</h3>
                <p className="text-sm text-muted-foreground">
                  You have {credits} analysis credits remaining
                </p>
              </div>
              <div className="text-3xl font-bold">{credits}</div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyzeForm credits={credits} apiKey={apiKey} />
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4 pl-4">
              <li className="text-sm">
                <span className="font-medium">Enter Job Description</span>
                <p className="text-muted-foreground ml-5">
                  Paste the complete job posting text including requirements and
                  qualifications
                </p>
              </li>
              <li className="text-sm">
                <span className="font-medium">Upload Resume</span>
                <p className="text-muted-foreground ml-5">
                  Upload a PDF version of the resume you want to analyze
                </p>
              </li>
              <li className="text-sm">
                <span className="font-medium">Get Analysis</span>
                <p className="text-muted-foreground ml-5">
                  Our AI will compare the resume against the job requirements
                  and provide detailed feedback
                </p>
              </li>
              <li className="text-sm">
                <span className="font-medium">Review Results</span>
                <p className="text-muted-foreground ml-5">
                  See match scores, keyword analysis, and suggestions for
                  improvement
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
