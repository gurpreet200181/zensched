-- Fix hr_team_health to average over exactly 7 calendar days, zero-filling missing days
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
    SELECT (CURRENT_DATE - offs)::date AS day
    FROM generate_series(0, 6) AS offs
  ),
  prev7_days AS (
    SELECT (CURRENT_DATE - 13 + offs)::date AS day
    FROM generate_series(0, 6) AS offs
  ),
  recent7_days AS (
    SELECT (CURRENT_DATE - 6 + offs)::date AS day
    FROM generate_series(0, 6) AS offs
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
        (SELECT AVG(COALESCE(da1.busyness_score, 0))
         FROM prev7_days d1
         LEFT JOIN daily_analytics da1 ON da1.user_id = p.user_id AND da1.day = d1.day)
        -
        (SELECT AVG(COALESCE(da2.busyness_score, 0))
         FROM recent7_days d2
         LEFT JOIN daily_analytics da2 ON da2.user_id = p.user_id AND da2.day = d2.day)
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