
import { useState } from "react";
import AppNav from "@/components/AppNav";
import AnalyticsChart from "@/components/AnalyticsChart";
import AnalyticsPie from "@/components/AnalyticsPie";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type DayPoint = { day: string; meetings: number; busyness: number };

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function getWeekEnd(weekStart: Date): Date {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);
  return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + (weeks * 7));
  return result;
}

function fmtDayShort(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function Analytics() {
  const [selectedWeek, setSelectedWeek] = useState<Date>(getWeekStart(new Date()));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-week", selectedWeek],
    queryFn: async () => {
      const weekStart = new Date(selectedWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = getWeekEnd(weekStart);
      weekEnd.setHours(23, 59, 59, 999);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { 
          daySeries: [] as DayPoint[], 
          pie: [] as { name: string; value: number }[] 
        };
      }

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString());

      const buckets = new Map<string, { meetings: number; busyness: number }>();
      const typeCounts = new Map<string, number>();

      // Seed buckets for Monday to Sunday
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      dayNames.forEach(day => {
        buckets.set(day, { meetings: 0, busyness: 0 });
      });

      (events || []).forEach((e: any) => {
        const eventDate = new Date(e.start_time);
        const dayKey = fmtDayShort(eventDate);
        const b = buckets.get(dayKey);
        if (b) {
          // Count all events as meetings unless they're explicitly personal/break events
          const isPersonalOrBreak = e.classification === "personal" || 
                                   e.classification === "break" ||
                                   (e.title && e.title.toLowerCase().includes("break")) ||
                                   (e.title && e.title.toLowerCase().includes("lunch")) ||
                                   (e.title && e.title.toLowerCase().includes("yoga"));
          
          if (!isPersonalOrBreak) {
            b.meetings += 1;
          }
          
          // Simple busyness estimate based on event duration
          const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60);
          b.busyness = Math.min(100, b.busyness + Math.round(duration * 12));
        }

        const key = (e.classification || "meeting") as string;
        typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
      });

      // Ensure consistent Monday to Sunday ordering
      const daySeries: DayPoint[] = dayNames.map(day => ({
        day,
        meetings: buckets.get(day)?.meetings || 0,
        busyness: buckets.get(day)?.busyness || 0
      }));

      const pie = Array.from(typeCounts.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      return { daySeries, pie };
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedWeek(getWeekStart(date));
      setIsCalendarOpen(false);
    }
  };

  const goToPreviousWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, -1));
  };

  const goToNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1));
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(getWeekStart(new Date()));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Analytics</h1>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
        
        {/* Week Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatWeekRange(selectedWeek)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedWeek}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            This Week
          </Button>
        </div>
      </div>

      {data && (data.daySeries.length > 0 || data.pie.length > 0) ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
            <AnalyticsChart data={data.daySeries} type="bar" />
            <AnalyticsChart data={data.daySeries} type="line" />
          </div>
          <div className="lg:col-span-1">
            <AnalyticsPie data={data.pie} />
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No analytics data available yet.</p>
          <p className="text-sm text-gray-500">Add some calendar events to see your analytics.</p>
        </div>
      )}
    </div>
  );
}

