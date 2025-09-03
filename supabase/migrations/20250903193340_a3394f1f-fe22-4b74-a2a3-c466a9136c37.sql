-- Populate daily analytics for the user with correct function parameters
-- This will process their 190 events and generate proper daily analytics

SELECT populate_daily_analytics_from_events(
  'a9fd332e-80e1-41b3-aedf-09f3d22f2eda'::uuid,
  (CURRENT_DATE - INTERVAL '30 days')::date,
  CURRENT_DATE::date
);