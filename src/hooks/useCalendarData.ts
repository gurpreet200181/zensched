
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAIRecommendations } from './useAIRecommendations';

export type CalendarEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  classification: 'meeting' | 'focus' | 'break' | 'personal' | 'travel' | 'buffer';
  attendees?: number;
  location?: string;
};

function startEndOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toHHmm(date: Date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

export function useCalendarData(selectedDate: Date = new Date()) {
  // First, get the calendar events
  const calendarQuery = useQuery({
    queryKey: ['calendar-events', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      console.log('Loading calendar data for date:', selectedDate.toISOString().split('T')[0]);
      
      const { start, end } = startEndOfDay(selectedDate);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('No session found');
        return {
          events: [] as CalendarEvent[],
          busynessScore: 0,
          busyHours: 0,
          freeHours: 8,
          totalEvents: 0,
        };
      }

      // Load events for the selected date
      console.log('Loading events from database...');
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', start.toISOString())
        .lt('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error loading events:', eventsError);
        throw eventsError;
      }

      console.log(`Loaded ${events?.length || 0} events from database`);

      const calendarEvents: CalendarEvent[] = (events || []).map((e: any) => {
        const s = new Date(e.start_time);
        const en = new Date(e.end_time);
        return {
          id: e.id,
          title: e.title,
          startTime: toHHmm(s),
          endTime: toHHmm(en),
          classification: (e.classification || 'meeting') as CalendarEvent['classification'],
          attendees: e.attendees_count ?? undefined,
          location: e.location ?? undefined,
        };
      });

      // Calculate metrics - breaks count as free time, not busy time
      const totalMinutes = (events || []).reduce((acc: number, e: any) => {
        const classification = e.classification || 'meeting';
        // Don't count breaks as busy time
        if (classification === 'break') return acc;
        return acc + minutesBetween(new Date(e.start_time), new Date(e.end_time));
      }, 0);

      const busyHours = Math.round((totalMinutes / 60) * 10) / 10;
      const workDayHours = 8; // Assuming 8-hour work day
      
      // Add break time to free hours
      const breakMinutes = (events || []).reduce((acc: number, e: any) => {
        const classification = e.classification || 'meeting';
        if (classification === 'break') {
          return acc + minutesBetween(new Date(e.start_time), new Date(e.end_time));
        }
        return acc;
      }, 0);
      
      const breakHours = Math.round((breakMinutes / 60) * 10) / 10;
      const freeHours = Math.max(0, workDayHours - busyHours + breakHours);
      
      // Calculate busyness score (0-100) - breaks don't increase busyness
      const busynessScore = Math.min(100, Math.round((busyHours / workDayHours) * 100));

      console.log('Calendar data processed:', {
        totalEvents: calendarEvents.length,
        busyHours,
        freeHours,
        busynessScore,
        breakHours
      });

      return {
        events: calendarEvents,
        busynessScore,
        busyHours,
        freeHours,
        totalEvents: calendarEvents.length,
      };
    },
  });

  // Then get AI recommendations based on the events
  const aiRecommendations = useAIRecommendations(
    calendarQuery.data?.events || [],
    !calendarQuery.isLoading && !!calendarQuery.data?.events,
    selectedDate
  );

  return {
    data: calendarQuery.data ? {
      ...calendarQuery.data,
      recommendations: aiRecommendations.data?.recommendations || [],
      aiSummary: aiRecommendations.data?.summary
    } : undefined,
    isLoading: calendarQuery.isLoading,
    error: calendarQuery.error,
    aiLoading: aiRecommendations.isLoading,
    aiError: aiRecommendations.error
  };
}
