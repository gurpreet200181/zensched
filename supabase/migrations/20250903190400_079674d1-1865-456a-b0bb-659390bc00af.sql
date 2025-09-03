-- Recompute 7-day averages over calendar days with zero-fill for missing days
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
  WITH last7_days AS (
    SELECT generate_series((CURRENT_DATE - INTERVAL '6 day')::date, CURRENT_DATE, INTERVAL '1 day')::date AS day
  ),
  last7 AS (
    SELECT p.user_id,
           COALESCE(AVG(COALESCE(da.busyness_score, 0)), 0)::int AS avg7,
           COALESCE(AVG(COALESCE(da.meeting_count, 0)), 0)::int AS avgmtg,
           COALESCE(AVG(COALESCE(da.after_hours_min, 0)), 0)::int AS avgaft
    FROM profiles p
    LEFT JOIN last7_days d ON TRUE
    LEFT JOIN daily_analytics da ON da.user_id = p.user_id AND da.day = d.day
    WHERE p.org_id = org_in
    GROUP BY p.user_id
  ),
  trend AS (
    SELECT p.user_id,
      (
        (
          SELECT AVG(COALESCE(da.busyness_score, 0))
          FROM generate_series((CURRENT_DATE - INTERVAL '13 day')::date, (CURRENT_DATE - INTERVAL '7 day')::date, INTERVAL '1 day')::date AS day
          LEFT JOIN daily_analytics da ON da.user_id = p.user_id AND da.day = day
        )
        -
        (
          SELECT AVG(COALESCE(da.busyness_score, 0))
          FROM generate_series((CURRENT_DATE - INTERVAL '6 day')::date, CURRENT_DATE, INTERVAL '1 day')::date AS day
          LEFT JOIN daily_analytics da ON da.user_id = p.user_id AND da.day = day
        )
      )::int AS delta
    FROM profiles p
    WHERE p.org_id = org_in
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