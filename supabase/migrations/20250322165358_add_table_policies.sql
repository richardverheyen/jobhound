-- Grant select permissions on jobs table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;

-- Grant select permissions on job_scans table to authenticated users
GRANT SELECT, DELETE ON public.job_scans TO authenticated;

-- Grant select permissions on resumes table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;

-- Grant select permissions on credit_purchases table to authenticated users
GRANT SELECT ON public.credit_purchases TO authenticated;

-- Grant select permissions on credit_usage table to authenticated users
GRANT SELECT ON public.credit_usage TO authenticated;

-- Grant usage permissions on the public schema
GRANT USAGE ON SCHEMA public TO authenticated;
