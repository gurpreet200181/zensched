
import AppNav from "@/components/AppNav";
import BusynessScore from "@/components/BusynessScore";
import EventList from "@/components/EventList";
import AnalyticsChart from "@/components/AnalyticsChart";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTodayData } from "@/hooks/useTodayData";

const Dashboard = () => {
  const { data, isLoading, error } = useTodayData();

  const chartData = [
    { day: "Mon", meetings: 4, busyness: 65 },
    { day: "Tue", meetings: 6, busyness: 78 },
    { day: "Wed", meetings: 3, busyness: 45 },
    { day: "Thu", meetings: 5, busyness: 72 },
    { day: "Fri", meetings: 2, busyness: 35 },
  ];

  return (
    <div className="min-h-screen bg-wellness-gradient">
      <AppNav />

      <div className="container mx-auto px-6 py-8">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Today</h2>
              <p className="text-gray-600">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Connected to Calendar
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <BusynessScore score={data?.score || 0} />
            {isLoading && (
              <div className="wellness-card p-6">
                <p className="text-gray-600">Loading your events…</p>
              </div>
            )}
            {error && (
              <div className="wellness-card p-6">
                <p className="text-red-600">Failed to load events.</p>
              </div>
            )}
            {!isLoading && !error && <EventList events={data?.events || []} />}

            {/* Analytics Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <AnalyticsChart data={chartData} type="bar" />
              <AnalyticsChart data={chartData} type="line" />
            </div>
          </div>

          <div className="space-y-8">
            <div className="wellness-card p-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Wellness Summary
              </h3>
              <p className="text-sm text-gray-700">
                {data?.summary || "Sign in to see your personalized summary."}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 rounded-lg bg-white/60">
                  <div className="text-xs text-gray-500">Meetings</div>
                  <div className="text-lg font-semibold">
                    {data?.meetingCount ?? 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/60">
                  <div className="text-xs text-gray-500">Focus mins</div>
                  <div className="text-lg font-semibold">
                    {data?.focusMinutes ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="wellness-card p-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Week Overview
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Meetings</span>
                  <span className="font-semibold">—</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Meeting Hours</span>
                  <span className="font-semibold">—</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Busyness</span>
                  <span className="font-semibold">—</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">After Hours</span>
                  <span className="font-semibold text-orange-600">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      
    </div>
  );
};

export default Dashboard;

