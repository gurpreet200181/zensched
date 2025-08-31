
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UIEvent = {
  id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  classification: 'meeting' | 'focus' | 'break' | 'personal' | 'travel' | 'buffer';
  attendees?: number;
  location?: string;
};

function toHHmm(date: Date) {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function startEndOfToday() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

export function useTodayData() {
  return useQuery({
    queryKey: ["today-data"],
    queryFn: async () => {
      const { start, end } = startEndOfToday();

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return {
          events: [] as UIEvent[],
          score: 0,
          summary: "Sign in to see your schedule.",
          meetingCount: 0,
          focusMinutes: 0,
        };
      }

      // Load today's events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", start.toISOString())
        .lt("start_time", end.toISOString())
        .order("start_time", { ascending: true });

      if (eventsError) throw eventsError;

      // Try to load a saved busyness score; if missing, compute a quick estimate
      const { data: scoreRow } = await supabase
        .from("busyness_scores")
        .select("*")
        .eq("date", start.toISOString().slice(0, 10))
        .maybeSingle();

      const uiEvents: UIEvent[] =
        (events || []).map((e: any) => {
          const s = new Date(e.start_time);
          const en = new Date(e.end_time);
          return {
            id: e.id,
            title: e.title,
            startTime: toHHmm(s),
            endTime: toHHmm(en),
            classification: (e.classification ||
              "meeting") as UIEvent["classification"],
            attendees: e.attendees_count ?? undefined,
            location: e.location ?? undefined,
          };
        });

      // Compute simple metrics
      const meetingCount = uiEvents.filter((e) => e.classification === "meeting").length;
      const focusMinutes = (events || []).reduce((acc: number, e: any) => {
        if (e.classification === "focus") {
          return acc + minutesBetween(new Date(e.start_time), new Date(e.end_time));
        }
        return acc;
      }, 0);

      const computedScore = Math.min(
        100,
        meetingCount * 12 + Math.round(focusMinutes / 6)
      );

      const score = scoreRow?.score ?? computedScore;
      const summary =
        uiEvents.length > 0
          ? `You have ${meetingCount} meetings; best focus window appears after your last meeting.`
          : "No events today. Great time for deep work or recovery.";

      return {
        events: uiEvents,
        score,
        summary,
        meetingCount,
        focusMinutes,
      };
    },
  });
}

