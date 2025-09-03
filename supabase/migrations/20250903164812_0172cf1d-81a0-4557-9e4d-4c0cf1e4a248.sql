-- Delete user-related data for emailforworkshoptests@gmail.com
DO $$
DECLARE
  target_email text := 'emailforworkshoptests@gmail.com';
  target_user_id uuid;
BEGIN
  -- First find the user_id
  SELECT user_id INTO target_user_id FROM public.profiles WHERE email = target_email;
  
  -- If user exists, delete all related data
  IF target_user_id IS NOT NULL THEN
    -- Delete dependent records first
    DELETE FROM public.events WHERE user_id = target_user_id;
    DELETE FROM public.calendar_integrations WHERE user_id = target_user_id;
    DELETE FROM public.daily_analytics WHERE user_id = target_user_id;
    DELETE FROM public.busyness_scores WHERE user_id = target_user_id;
    DELETE FROM public.org_members WHERE user_id = target_user_id;
    
    -- Finally delete the profile
    DELETE FROM public.profiles WHERE user_id = target_user_id;
    
    RAISE NOTICE 'Deleted all data for user: %', target_email;
  ELSE
    RAISE NOTICE 'User not found: %', target_email;
  END IF;
END $$;