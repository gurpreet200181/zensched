-- Create a function to populate daily_analytics from events
CREATE OR REPLACE FUNCTION populate_daily_analytics_from_events(user_id_param uuid, start_date date, end_date date)
RETURNS void
LANGUAGE plpgsql
AS $$
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
            COUNT(*) FILTER (WHERE classification IN ('meeting', 'focus', 'personal', 'travel', 'buffer')) as meetings,
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
$$;

-- Add unique constraint to prevent duplicates
ALTER TABLE daily_analytics ADD CONSTRAINT daily_analytics_user_day_unique UNIQUE (user_id, day);

-- Populate data for Gurpreet for the last 14 days
SELECT populate_daily_analytics_from_events(
    'b6ad1d51-0f37-4b77-ab64-595b6df6b9e7'::uuid,
    (CURRENT_DATE - INTERVAL '14 days')::date,
    CURRENT_DATE
);