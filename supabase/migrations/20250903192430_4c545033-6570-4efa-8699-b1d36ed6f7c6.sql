-- Migration: Purge all app data for a specific email
-- Purpose: Remove records tied to the given email across public tables
-- NOTE: This does not delete the Auth user (auth.users). We can add a secure edge function for that if desired.

BEGIN;

-- Target user ids for the specified email
WITH target AS (
  SELECT user_id FROM public.profiles WHERE email = 'emailforworkshoptests@gmail.com'
)

-- Delete dependent data first
, del_events AS (
  DELETE FROM public.events e
  USING target t
  WHERE e.user_id = t.user_id
  RETURNING 1
)
, del_daily AS (
  DELETE FROM public.daily_analytics d
  USING target t
  WHERE d.user_id = t.user_id
  RETURNING 1
)
, del_busyness AS (
  DELETE FROM public.busyness_scores b
  USING target t
  WHERE b.user_id = t.user_id
  RETURNING 1
)
, del_calendar AS (
  DELETE FROM public.calendar_integrations c
  USING target t
  WHERE c.user_id = t.user_id
  RETURNING 1
)
, del_org_members AS (
  DELETE FROM public.org_members m
  USING target t
  WHERE m.user_id = t.user_id
  RETURNING 1
)

-- Finally delete profiles for that email
DELETE FROM public.profiles p
USING target t
WHERE p.user_id = t.user_id AND p.email = 'emailforworkshoptests@gmail.com';

COMMIT;