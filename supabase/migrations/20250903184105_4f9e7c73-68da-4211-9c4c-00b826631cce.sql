-- Populate analytics data for existing users with events
SELECT populate_daily_analytics_from_events('bdbfc91f-dd9c-442e-aceb-162f66b589ab'::uuid, '2025-08-21'::date, '2025-09-06'::date);