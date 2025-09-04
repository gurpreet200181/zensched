-- Add DELETE policy so users can clear their own analytics when calendars are removed
CREATE POLICY "Users can delete their own analytics"
ON public.daily_analytics
FOR DELETE
USING (auth.uid() = user_id);
