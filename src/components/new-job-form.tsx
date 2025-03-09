"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase/supabase";

interface NewJobFormProps {
  userId?: string; // Optional since we're not using it anymore
}

export default function NewJobForm({ userId }: NewJobFormProps) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Job title is required");
      return;
    }

    if (!description.trim()) {
      setError("Job description is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the authenticated user's ID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      // Create job record in Supabase
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert([
          {
            user_id: user.id,
            title,
            company: company || null,
            location: location || null,
            description,
          },
        ])
        .select()
        .single();

      if (jobError) throw jobError;

      // Redirect to the job page with option to analyze
      router.push(`/dashboard/jobs/${job.id}`);
    } catch (err: any) {
      console.error("Error creating job:", err);
      setError(err.message || "Failed to create job");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Job Title *
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Software Engineer"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company" className="text-sm font-medium">
            Company
          </Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc."
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Remote, San Francisco, etc."
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Job Description *
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            className="min-h-[200px]"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Job"
        )}
      </Button>
    </form>
  );
}
