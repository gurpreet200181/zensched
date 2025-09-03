-- Delete user-related data for a specific email across public tables
DO $$
DECLARE
  target_email text := 'emailforworkshoptests@gmail.com';
BEGIN
  -- Use the profiles table to find the user_id
  WITH u AS (
    SELECT user_id FROM public.profiles WHERE email = target_email
  )
  -- Delete dependent records first
  DELETE FROM public.events 
  WHERE user_id IN (SELECT user_id FROM u);

  DELETE FROM public.calendar_integrations 
  WHERE user_id IN (SELECT user_id FROM u);

  DELETE FROM public.daily_analytics 
  WHERE user_id IN (SELECT user_id FROM u);

  DELETE FROM public.busyness_scores 
  WHERE user_id IN (SELECT user_id FROM u);

  DELETE FROM public.org_members 
  WHERE user_id IN (SELECT user_id FROM u);

  -- Finally delete the profile
  DELETE FROM public.profiles 
  WHERE user_id IN (SELECT user_id FROM u);
END $$;