
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarSyncService } from '@/services/calendarSync';

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

function generateRecommendations(busynessScore: number, events: CalendarEvent[]) {
  const recommendations = [];
  
  if (busynessScore > 80) {
    recommendations.push({
      id: '1',
      title: 'Add buffer time between meetings',
      reason: 'Your schedule is very packed. Adding 15-minute buffers can reduce stress and improve focus.',
      actionType: 'ADD_BUFFER' as const,
      confidence: 95
    });
    
    recommendations.push({
      id: '2',
      title: 'Consider rescheduling non-critical meetings',
      reason: 'Moving some meetings to less busy days can create breathing room.',
      actionType: 'RESCHEDULE_NOTE' as const,
      confidence: 88
    });
  }
  
  if (busynessScore > 60) {
    const hasBreaks = events.some(e => e.classification === 'break');
    if (!hasBreaks) {
      recommendations.push({
        id: '3',
        title: 'Schedule a wellness break',
        reason: 'No breaks detected. A 15-30 minute break can improve productivity.',
        actionType: 'ADD_BUFFER' as const,
        confidence: 92
      });
    }
    
    const focusTime = events.filter(e => e.classification === 'focus').length;
    if (focusTime === 0) {
      recommendations.push({
        id: '4',
        title: 'Block time for deep work',
        reason: 'No dedicated focus time found. Consider blocking 2+ hours for important tasks.',
        actionType: 'BLOCK_FOCUS' as const,
        confidence: 85
      });
    }
  }
  
  if (busynessScore > 40) {
    recommendations.push({
      id: '5',
      title: 'Prepare for tomorrow',
      reason: 'Set aside 10 minutes to review tomorrow\'s agenda and priorities.',
      actionType: 'PREP_NOTE' as const,
      confidence: 78
    });
  }
  
  return recommendations;
}

export function useCalendarData(selectedDate: Date = new Date()) {
  const [date] = useState(selectedDate);

  return useQuery({
    queryKey: ['calendar-data', date.toISOString().split('T')[0]],
    queryFn: async () => {
      console.log('Loading calendar data for date:', date.toISOString().split('T')[0]);
      
      const { start, end } = startEndOfDay(date);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('No session found');
        return {
          events: [] as CalendarEvent[],
          busynessScore: 0,
          busyHours: 0,
          freeHours: 8, // Default work day
          totalEvents: 0,
          recommendations: [],
        };
      }

      console.log('User session found, syncing calendars...');

      // Trigger calendar sync for the current user
      try {
        await CalendarSyncService.syncAllUserCalendars(sessionData.session.user.id);
        console.log('Calendar sync completed');
      } catch (error) {
        console.error('Error syncing calendars:', error);
        // Continue with loading existing events even if sync fails
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

      // Generate AI recommendations
      const recommendations = generateRecommendations(busynessScore, calendarEvents);

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
        recommendations,
      };
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
}

