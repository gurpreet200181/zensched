CREATE OR REPLACE FUNCTION public.hr_team_health(org_in uuid)
 RETURNS TABLE(user_id uuid, display_name text, avg7_score integer, trend_delta integer, avg_meetings integer, avg_after_hours_min integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         COALESCE(l.avgaft, 0) AS avg_after_hours_min
  FROM profiles p
  LEFT JOIN last7 l ON l.user_id = p.user_id
  LEFT JOIN trend t ON t.user_id = p.user_id
  WHERE p.org_id = org_in;
$function$