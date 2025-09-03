
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarEvent } from './useCalendarData';

export interface AIRecommendation {
  id: string;
  title: string;
  reason: string;
  actionType: 'ADD_BUFFER' | 'BLOCK_FOCUS' | 'RESCHEDULE_NOTE' | 'PREP_NOTE';
  confidence?: number;
  params?: Record<string, any>;
}

export interface AIAnalysisResult {
  recommendations: AIRecommendation[];
  summary: string;
}

export function useAIRecommendations(events: CalendarEvent[], enabled: boolean = true, selectedDate?: Date) {
  return useQuery({
    queryKey: ['ai-recommendations', events.length, selectedDate?.toDateString(), events.map(e => e.id).join(',')],
    queryFn: async (): Promise<AIAnalysisResult> => {
      console.log('Requesting AI analysis for', events.length, 'events');
      
      const { data, error } = await supabase.functions.invoke('ai-calendar-analysis', {
        body: {
          events: events.map(e => ({
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            classification: e.classification,
            attendees: e.attendees,
            location: e.location
          })),
          workHours: {
            start: "09:00",
            end: "17:00"
          }
        }
      });

      if (error) {
        console.error('AI analysis error:', error);
        throw error;
      }

      console.log('AI recommendations received:', data);
      return data;
    },
    enabled: enabled && events.length > 0,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: 1
  });
}
