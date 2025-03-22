import { createScan } from "@/app/lib/scanService";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useCreateScan() {
  const router = useRouter();
  const [isCreatingScan, setIsCreatingScan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateScan = async (
    userId: string,
    jobId: string,
    resumeId: string,
    resumeFile?: File,
    resumeFilename?: string
  ) => {
    if (!jobId || !resumeId) {
      setError("Please select both a job and a resume before creating a scan.");
      return;
    }

    setIsCreatingScan(true);
    setError(null);

    try {
      // Call the scan service
      const result = await createScan({
        jobId,
        resumeId,
        resumeFile,
        resumeFilename,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create scan. Please try again.");
      }

      // Redirect to the job page 
      router.push(result.redirectUrl || `/dashboard/jobs/${jobId}`);
      
      return result;
    } catch (error: any) {
      console.error("Error creating scan:", error);
      setError(error.message || "Failed to create scan. Please try again.");
      return { success: false, error: error.message };
    } finally {
      setIsCreatingScan(false);
    }
  };

  return {
    handleCreateScan,
    isCreatingScan,
    error,
    setError,
  };
} 