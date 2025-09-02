
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import BusynessScore from '@/components/BusynessScore';
import EventList from '@/components/EventList';
import WellnessRecommendations from '@/components/WellnessRecommendations';
import DailyNarrative from '@/components/DailyNarrative';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import SyncStatusBadge from '@/components/SyncStatusBadge';
import { useLiveSync } from '@/hooks/useLiveSync';
import AnalyticsChart from '@/components/AnalyticsChart';
import AnalyticsPie from '@/components/AnalyticsPie';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { data, isLoading, error, aiLoading, aiError } = useCalendarData(selectedDate);
  const { statusLabel, isPushActive } = useLiveSync();

  // Analytics data query
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics-7d"],
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { 
          daySeries: [] as { day: string; meetings: number; busyness: number }[], 
          pie: [] as { name: string; value: number }[] 
        };
      }

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", start.toISOString())
        .lt("start_time", new Date(end.getTime() + 24*60*60*1000).toISOString());

      const buckets = new Map<string, { meetings: number; busyness: number }>();
      const typeCounts = new Map<string, number>();

      // Seed buckets for 7 days
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        d.setHours(0, 0, 0, 0);
        const dayKey = d.toLocaleDateString(undefined, { weekday: "short" });
        buckets.set(dayKey, { meetings: 0, busyness: 0 });
      }

      (events || []).forEach((e: any) => {
        const eventDate = new Date(e.start_time);
        eventDate.setHours(0, 0, 0, 0);
        const dayKey = eventDate.toLocaleDateString(undefined, { weekday: "short" });
        const b = buckets.get(dayKey);
        if (b) {
          if (e.classification === "meeting") b.meetings += 1;
          // Simple busyness estimate based on event duration
          const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60);
          b.busyness = Math.min(100, b.busyness + Math.round(duration * 12));
        }

        const key = (e.classification || "meeting") as string;
        typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
      });

      const daySeries = Array.from(buckets.entries()).map(
        ([day, v]) => ({ day, meetings: v.meetings, busyness: v.busyness })
      );

      const pie = Array.from(typeCounts.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      return { daySeries, pie };
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <SyncStatusBadge status={statusLabel} isPushActive={isPushActive} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Daily Narrative - only show for today */}
        {selectedDate.toDateString() === new Date().toDateString() && (
          <DailyNarrative />
        )}

        {/* Busyness Score */}
        <BusynessScore score={data?.busynessScore || 0} />

        {/* Busy/Free Hours Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Busy Hours</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '—' : `${data?.busyHours || 0}h`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Free Hours</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '—' : `${data?.freeHours || 0}h`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar Control - Collapsible */}
          <div className="lg:col-span-1">
            <Collapsible open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-between p-4 h-auto">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span>Select Date</span>
                  </div>
                  {isCalendarOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="w-full"
                      disabled={(date) => date > new Date()}
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* AI Wellness Recommendations */}
            {!isLoading && !error && (
              <WellnessRecommendations 
                recommendations={data?.recommendations || []}
                summary={data?.aiSummary || (data?.busynessScore ? `Based on your ${data.busynessScore}% busyness score, here are personalized suggestions to optimize your schedule and reduce stress.` : undefined)}
                aiEnabled={true}
                aiLoading={aiLoading}
              />
            )}

            {/* Events List */}
            {isLoading && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600">Loading your events…</p>
                </CardContent>
              </Card>
            )}
            
            {error && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-red-600">Failed to load events.</p>
                </CardContent>
              </Card>
            )}
            
            {!isLoading && !error && (
              <EventList events={data?.events || []} />
            )}

            {/* Analytics Section */}
            {!analyticsLoading && analyticsData && (analyticsData.daySeries.length > 0 || analyticsData.pie.length > 0) && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Weekly Analytics</h2>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                    <AnalyticsChart data={analyticsData.daySeries} type="bar" />
                    <AnalyticsChart data={analyticsData.daySeries} type="line" />
                  </div>
                  <div className="lg:col-span-1">
                    <AnalyticsPie data={analyticsData.pie} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
