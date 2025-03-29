-- Create a trigger that automatically updates the structured columns
DROP TRIGGER IF EXISTS scan_results_trigger ON job_scans;
CREATE TRIGGER scan_results_trigger
BEFORE INSERT OR UPDATE ON job_scans
FOR EACH ROW
EXECUTE FUNCTION update_scan_results();

-- Create function to create a job scan and use a credit
CREATE OR REPLACE FUNCTION create_job_scan(
  p_user_id UUID,
  p_job_id UUID,
  p_resume_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_purchase_id UUID;
  v_scan_id UUID;
  v_result JSONB;
BEGIN
  -- Find the oldest purchase with available credits
  SELECT id INTO v_purchase_id
  FROM credit_purchases
  WHERE user_id = p_user_id
  AND remaining_credits > 0
  AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY COALESCE(expires_at, 'infinity'::timestamptz) ASC, created_at ASC
  LIMIT 1
  FOR UPDATE;
  
  -- If no purchase with available credits found
  IF v_purchase_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Decrement the credit
  UPDATE credit_purchases
  SET remaining_credits = remaining_credits - 1
  WHERE id = v_purchase_id;
  
  -- Create the job scan record with credit purchase reference
  INSERT INTO job_scans (
    user_id,
    job_id,
    resume_id,
    credit_purchase_id,
    status,
    created_at
  )
  VALUES (
    p_user_id,
    p_job_id,
    p_resume_id,
    v_purchase_id,
    'pending',
    NOW()
  )
  RETURNING id INTO v_scan_id;
  
  -- Also record in credit_usage for backward compatibility
  INSERT INTO credit_usage (
    purchase_id,
    user_id,
    scan_id,
    request_payload,
    created_at
  )
  VALUES (
    v_purchase_id,
    p_user_id,
    v_scan_id,
    p_request_payload,
    NOW()
  );
  
  RETURN v_scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 