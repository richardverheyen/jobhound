-- Credit System Migration
-- This migration adds tables and functions for the credit purchase and usage system

-- Credit purchases table
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  credit_amount INTEGER NOT NULL,
  remaining_credits INTEGER NOT NULL,
  stripe_session_id TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit usage table
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES credit_purchases(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  scan_id UUID,
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on credit tables
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- Create credit RLS policies
CREATE POLICY "Users can view their own credit purchases" 
  ON credit_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit usage" 
  ON credit_usage FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_expires_at ON credit_purchases(expires_at);
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_purchase_id ON credit_usage(purchase_id);
CREATE INDEX idx_credit_usage_scan_id ON credit_usage(scan_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);

-- Create functions for credit management
CREATE OR REPLACE FUNCTION get_available_credits(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(remaining_credits), 0)::INTEGER
  FROM credit_purchases
  WHERE user_id = p_user_id
  AND (expires_at IS NULL OR expires_at > NOW());
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to use a credit (general purpose)
CREATE OR REPLACE FUNCTION use_credit(
  p_user_id UUID,
  p_request_payload JSONB DEFAULT NULL,
  p_response_payload JSONB DEFAULT NULL,
  p_http_status INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_usage_id UUID;
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
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient credits');
  END IF;
  
  -- Decrement the credit
  UPDATE credit_purchases
  SET remaining_credits = remaining_credits - 1
  WHERE id = v_purchase_id;
  
  -- Record the usage
  INSERT INTO credit_usage (
    purchase_id,
    user_id,
    request_payload,
    response_payload,
    http_status,
    created_at
  )
  VALUES (
    v_purchase_id,
    p_user_id,
    p_request_payload,
    p_response_payload,
    p_http_status,
    NOW()
  )
  RETURNING id INTO v_usage_id;
  
  RETURN jsonb_build_object('success', true, 'usage_id', v_usage_id, 'purchase_id', v_purchase_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 