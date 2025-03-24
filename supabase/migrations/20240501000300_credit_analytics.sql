-- Credit System Analytics Functions
-- This migration adds functions for credit usage analytics and dashboard displays

-- Function to get detailed credit usage history for a user
CREATE OR REPLACE FUNCTION get_user_credit_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  usage_id UUID,
  purchase_id UUID,
  scan_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  scan_status TEXT,
  job_title TEXT,
  match_score FLOAT8
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id AS usage_id,
    cu.purchase_id,
    cu.scan_id,
    cu.created_at,
    js.status AS scan_status,
    j.title AS job_title,
    js.match_score
  FROM credit_usage cu
  LEFT JOIN job_scans js ON cu.scan_id = js.id
  LEFT JOIN jobs j ON js.job_id = j.id
  WHERE cu.user_id = p_user_id
  ORDER BY cu.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user credit summary (for frontend dashboard)
CREATE OR REPLACE FUNCTION get_user_credit_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_available_credits INTEGER;
  v_total_purchased INTEGER;
  v_total_used INTEGER;
  v_recent_usage JSONB;
BEGIN
  -- Get available credits
  SELECT COALESCE(SUM(remaining_credits), 0)::INTEGER INTO v_available_credits
  FROM credit_purchases
  WHERE user_id = p_user_id
  AND (expires_at IS NULL OR expires_at > NOW());
  
  -- Get total purchased credits
  SELECT COALESCE(SUM(credit_amount), 0)::INTEGER INTO v_total_purchased
  FROM credit_purchases
  WHERE user_id = p_user_id;
  
  -- Get total used credits
  SELECT COALESCE(COUNT(*), 0)::INTEGER INTO v_total_used
  FROM credit_usage
  WHERE user_id = p_user_id;
  
  -- Get recent usage (last 5)
  SELECT COALESCE(json_agg(r), '[]')::JSONB INTO v_recent_usage
  FROM (
    SELECT 
      cu.id,
      cu.created_at,
      js.status,
      j.title AS job_title,
      js.match_score
    FROM credit_usage cu
    LEFT JOIN job_scans js ON cu.scan_id = js.id
    LEFT JOIN jobs j ON js.job_id = j.id
    WHERE cu.user_id = p_user_id
    ORDER BY cu.created_at DESC
    LIMIT 5
  ) r;
  
  RETURN jsonb_build_object(
    'available_credits', v_available_credits,
    'total_purchased', v_total_purchased,
    'total_used', v_total_used,
    'recent_usage', v_recent_usage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified alias function for getting available credits
CREATE OR REPLACE FUNCTION get_user_available_credits(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT get_available_credits(p_user_id);
$$ LANGUAGE sql SECURITY DEFINER; 