-- Add role, org, and consent columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('user','hr','admin')) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS share_aggregate_with_org boolean DEFAULT false;

-- Create organizations table
CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create organization membership table
CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user','hr','admin')) DEFAULT 'user',
  PRIMARY KEY (org_id, user_id)
);

-- Create daily analytics table for aggregate wellness data
CREATE TABLE IF NOT EXISTS daily_analytics (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  busyness_score int NOT NULL,
  meeting_count int DEFAULT 0,
  after_hours_min int DEFAULT 0,
  largest_free_min int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

-- Enable RLS on new tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_members: users see only their own membership
CREATE POLICY "Users can view their own org membership" 
ON org_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own org membership" 
ON org_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for orgs: readable if current user is a member
CREATE POLICY "Users can view orgs they belong to" 
ON orgs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM org_members m 
  WHERE m.org_id = orgs.id AND m.user_id = auth.uid()
));

CREATE POLICY "Users can create orgs" 
ON orgs 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for daily_analytics: user sees own data; HR/Admin sees consented org members
CREATE POLICY "Users can view own analytics or org members with consent" 
ON daily_analytics 
FOR SELECT 
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM org_members m
    JOIN profiles p ON p.user_id = daily_analytics.user_id
    WHERE m.user_id = auth.uid()
      AND m.org_id = p.org_id
      AND m.role IN ('hr','admin')
      AND p.share_aggregate_with_org = true
  )
);

CREATE POLICY "Users can insert their own analytics" 
ON daily_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" 
ON daily_analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Helper function for HR team health overview
CREATE OR REPLACE FUNCTION hr_team_health(org_in uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avg7_score int,
  trend_delta int,
  avg_meetings int,
  avg_after_hours_min int,
  consent boolean
) 
LANGUAGE sql 
SECURITY DEFINER 
AS $$
  WITH last7 AS (
    SELECT da.user_id,
           AVG(da.busyness_score)::int AS avg7,
           AVG(da.meeting_count)::int AS avgmtg,
           AVG(da.after_hours_min)::int AS avgaft
    FROM daily_analytics da
    JOIN profiles p ON p.user_id = da.user_id
    WHERE p.org_id = org_in 
      AND da.day >= (CURRENT_DATE - INTERVAL '7 day')::date
    GROUP BY da.user_id
  ),
  trend AS (
    SELECT da.user_id,
      (AVG(da.busyness_score) FILTER (WHERE da.day BETWEEN (CURRENT_DATE - INTERVAL '14 day')::date AND (CURRENT_DATE - INTERVAL '8 day')::date)
      - AVG(da.busyness_score) FILTER (WHERE da.day BETWEEN (CURRENT_DATE - INTERVAL '7 day')::date AND CURRENT_DATE))::int AS delta
    FROM daily_analytics da
    JOIN profiles p ON p.user_id = da.user_id
    WHERE p.org_id = org_in
    GROUP BY da.user_id
  )
  SELECT p.user_id, 
         COALESCE(p.display_name, 'User') AS display_name,
         COALESCE(l.avg7, 0) AS avg7_score,
         COALESCE(t.delta, 0) AS trend_delta,
         COALESCE(l.avgmtg, 0) AS avg_meetings,
         COALESCE(l.avgaft, 0) AS avg_after_hours_min,
         p.share_aggregate_with_org AS consent
  FROM profiles p
  LEFT JOIN last7 l ON l.user_id = p.user_id
  LEFT JOIN trend t ON t.user_id = p.user_id
  WHERE p.org_id = org_in;
$$;