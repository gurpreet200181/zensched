
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import WorkloadIndex from '@/components/WorkloadIndex';
import EventList from '@/components/EventList';
import WellnessRecommendations from '@/components/WellnessRecommendations';
import DashboardSummary from '@/components/DashboardSummary';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import SyncStatusBadge from '@/components/SyncStatusBadge';
import { useLiveSync } from '@/hooks/useLiveSync';

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { data, isLoading, error, aiLoading, aiError } = useCalendarData(selectedDate);
  const { statusLabel, isPushActive } = useLiveSync();

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

      <div>
        {/* Top Row - Dashboard Summary and Workload Index as squares */}
        {selectedDate.toDateString() === new Date().toDateString() && (
          <div className="grid md:grid-cols-2 gap-4 items-stretch" style={{ marginBottom: '2.5px' }}>
            <div className="aspect-square flex">
              <div className="w-full">
                <DashboardSummary />
              </div>
            </div>
            <div className="aspect-square flex">
              <div className="w-full">
                <WorkloadIndex score={data?.busynessScore || 0} />
              </div>
            </div>
          </div>
        )}
        
        {/* Show only Workload Index if not today */}
        {selectedDate.toDateString() !== new Date().toDateString() && (
          <div style={{ marginBottom: '2.5px' }}>
            <WorkloadIndex score={data?.busynessScore || 0} />
          </div>
        )}

        {/* Controls Row - Smaller controls aligned horizontally */}
        <div className="grid md:grid-cols-3 gap-3">
          {/* Busy Hours */}
          <Card className="h-24">
            <CardContent className="p-4 h-full">
              <div className="flex items-center gap-3 h-full">
                <Clock className="h-6 w-6 text-orange-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-600">Busy Hours</p>
                  <p className="text-xl font-bold truncate">
                    {isLoading ? '—' : `${(data?.busyHours || 0).toFixed(1)}h`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Free Hours */}
          <Card className="h-24">
            <CardContent className="p-4 h-full">
              <div className="flex items-center gap-3 h-full">
                <Clock className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-600">Free Hours</p>
                  <p className="text-xl font-bold truncate">
                    {isLoading ? '—' : `${(data?.freeHours || 0).toFixed(1)}h`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Control */}
          <div className="h-24">
            <Collapsible open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full h-24 flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span className="text-sm">Select Date</span>
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
                  <CardContent className="p-2 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="pointer-events-auto"
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const oneWeekFromToday = new Date(today);
                        oneWeekFromToday.setDate(today.getDate() + 7);
                        
                        // Disable past dates (before today) and dates more than one week from today
                        return date < today || date > oneWeekFromToday;
                      }}
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* AI Wellness Recommendations */}
          {!isLoading && !error && (
            <WellnessRecommendations 
              recommendations={data?.recommendations || []}
              summary={data?.aiSummary}
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
