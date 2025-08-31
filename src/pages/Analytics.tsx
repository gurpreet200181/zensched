
import AppNav from "@/components/AppNav";
import AnalyticsChart from "@/components/AnalyticsChart";
import AnalyticsPie from "@/components/AnalyticsPie";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type DayPoint = { day: string; meetings: number; busyness: number };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDayShort(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function Analytics() {
  const { data } = useQuery({
    queryKey: ["analytics-7d"],
    queryFn: async () => {
      const end = new Date();
      const start = addDays(end, -6);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { daySeries: [] as DayPoint[], pie: [] as { name: string; value: number }[] };
      }

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", start.toISOString())
        .lt("start_time", addDays(end, 1).toISOString());

      const buckets = new Map<string, { meetings: number; busyness: number }>();
      const typeCounts = new Map<string, number>();

      // Seed buckets for 7 days
      for (let i = 0; i < 7; i++) {
        const d = addDays(startOfDay(start), i);
        buckets.set(fmtDayShort(d), { meetings: 0, busyness: 0 });
      }

      (events || []).forEach((e: any) => {
        const d = fmtDayShort(startOfDay(new Date(e.start_time)));
        const b = buckets.get(d)!;
        if (e.classification === "meeting") b.meetings += 1;
        // simple busyness estimate
        b.busyness = Math.min(100, b.busyness + 10);

        const key = (e.classification || "other") as string;
        typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
      });

      const daySeries: DayPoint[] = Array.from(buckets.entries()).map(
        ([day, v]) => ({ day, meetings: v.meetings, busyness: v.busyness })
      );

      const pie = Array.from(typeCounts.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      return { daySeries, pie };
    },
  });

  return (
    <div className="min-h-screen bg-wellness-gradient">
      <AppNav />
      <div className="container mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Analytics</h2>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
            <AnalyticsChart data={data?.daySeries || []} type="bar" />
            <AnalyticsChart data={data?.daySeries || []} type="line" />
          </div>
          <div className="lg:col-span-1">
            <AnalyticsPie data={data?.pie || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

