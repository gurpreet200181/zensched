-- Harden calendar_integrations to prevent token exposure to clients
-- 1) Keep existing RLS (already restricts rows to auth.uid())
-- 2) Enforce column-level privileges so clients cannot SELECT/UPDATE token columns
-- Note: Service role retains full access; we only change anon/authenticated grants

DO $$
BEGIN
  -- Revoke broad privileges from anon and authenticated
  REVOKE ALL ON TABLE public.calendar_integrations FROM anon;
  REVOKE ALL ON TABLE public.calendar_integrations FROM authenticated;

  -- Grant minimal required privileges back to authenticated users
  GRANT SELECT (id, user_id, provider, calendar_url, is_active, last_sync, created_at, updated_at)
  ON public.calendar_integrations TO authenticated;

  GRANT INSERT (user_id, provider, calendar_url, is_active, last_sync)
  ON public.calendar_integrations TO authenticated;

  GRANT UPDATE (provider, calendar_url, is_active, last_sync, updated_at)
  ON public.calendar_integrations TO authenticated;

  GRANT DELETE ON public.calendar_integrations TO authenticated;
END $$;