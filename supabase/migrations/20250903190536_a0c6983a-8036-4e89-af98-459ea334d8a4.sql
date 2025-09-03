-- Fix 7-day average calculation to include zero values for missing days
CREATE OR REPLACE FUNCTION public.hr_team_health(org_in uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avg7_score integer,
  trend_delta integer,
  avg_meetings integer,
  avg_after_hours_min integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH date_range AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '6 days', 
      CURRENT_DATE, 
      INTERVAL '1 day'
    )::date AS day
  ),
  last7 AS (
    SELECT p.user_id,
           AVG(COALESCE(da.busyness_score, 0))::int AS avg7,
           AVG(COALESCE(da.meeting_count, 0))::int AS avgmtg,
           AVG(COALESCE(da.after_hours_min, 0))::int AS avgaft
    FROM profiles p
    CROSS JOIN date_range dr
    LEFT JOIN daily_analytics da ON da.user_id = p.user_id AND da.day = dr.day
    WHERE p.org_id = org_in
    GROUP BY p.user_id
  ),
  trend_range_old AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '13 days', 
      CURRENT_DATE - INTERVAL '7 days', 
      INTERVAL '1 day'
    )::date AS day
  ),
  trend AS (
    SELECT p.user_id,
      (AVG(COALESCE(da_old.busyness_score, 0)) - AVG(COALESCE(da_new.busyness_score, 0)))::int AS delta
    FROM profiles p
    CROSS JOIN date_range dr_new
    CROSS JOIN trend_range_old dr_old
    LEFT JOIN daily_analytics da_new ON da_new.user_id = p.user_id AND da_new.day = dr_new.day
    LEFT JOIN daily_analytics da_old ON da_old.user_id = p.user_id AND da_old.day = dr_old.day
    WHERE p.org_id = org_in
    GROUP BY p.user_id
  )
  SELECT p.user_id,
         COALESCE(p.display_name, 'User') AS display_name,
         COALESCE(l.avg7, 0) AS avg7_score,
         COALESCE(t.delta, 0) AS trend_delta,
         COALESCE(l.avgmtg, 0) AS avg_meetings,
         COALESCE(l.avgaft, 0) AS avg_after_hours_min
  FROM profiles p
  LEFT JOIN last7 l ON l.user_id = p.user_id
  LEFT JOIN trend t ON t.user_id = p.user_id
  WHERE p.org_id = org_in;
$function$;