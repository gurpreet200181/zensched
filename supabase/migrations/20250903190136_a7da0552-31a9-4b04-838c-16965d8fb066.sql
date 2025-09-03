-- Fix the search path security issue
CREATE OR REPLACE FUNCTION public.populate_daily_analytics_from_events(user_id_param uuid, start_date date, end_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    process_date date;
    busy_minutes integer;
    meeting_count integer;
    after_hours_minutes integer;
    busyness_score integer;
    largest_free_block integer;
BEGIN
    process_date := start_date;
    
    WHILE process_date <= end_date LOOP
        -- Calculate metrics for each day
        SELECT 
            -- Count ALL non-break events as meetings for simplicity
            COUNT(*) FILTER (WHERE classification NOT IN ('break')) as meetings,
            COALESCE(SUM(
                CASE 
                    WHEN classification NOT IN ('break') THEN 
                        EXTRACT(epoch FROM (end_time - start_time)) / 60
                    ELSE 0 
                END
            ), 0)::integer as busy_mins,
            COALESCE(SUM(
                CASE 
                    WHEN start_time::time < '09:00'::time OR end_time::time > '17:00'::time THEN 
                        EXTRACT(epoch FROM (end_time - start_time)) / 60
                    ELSE 0
                END
            ), 0)::integer as after_hours_mins
        INTO meeting_count, busy_minutes, after_hours_minutes
        FROM events 
        WHERE user_id = user_id_param 
        AND DATE(start_time) = process_date;
        
        -- Calculate busyness score (0-100 based on 8-hour workday = 480 minutes)
        busyness_score := LEAST(100, ROUND((busy_minutes::decimal / 480) * 100));
        
        -- Estimate largest free block (simplified calculation)
        largest_free_block := GREATEST(0, 480 - busy_minutes);
        
        -- Insert or update daily_analytics
        INSERT INTO daily_analytics (
            user_id, day, busyness_score, meeting_count, 
            after_hours_min, largest_free_min
        ) VALUES (
            user_id_param, process_date, busyness_score, meeting_count,
            after_hours_minutes, largest_free_block
        )
        ON CONFLICT (user_id, day) DO UPDATE SET
            busyness_score = EXCLUDED.busyness_score,
            meeting_count = EXCLUDED.meeting_count,
            after_hours_min = EXCLUDED.after_hours_min,
            largest_free_min = EXCLUDED.largest_free_min,
            created_at = now();
            
        process_date := process_date + 1;
    END LOOP;
END;
$function$;