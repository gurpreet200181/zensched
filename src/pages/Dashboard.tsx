
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import BusynessScore from '@/components/BusynessScore';
import EventList from '@/components/EventList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data, isLoading, error } = useCalendarData(selectedDate);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
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

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar Control */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="w-full"
              disabled={(date) => date > new Date()}
            />
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Metrics Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Activity className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-gray-600">Busyness Score</p>
                    <p className="text-2xl font-bold">
                      {isLoading ? '—' : `${data?.busynessScore || 0}%`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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

          {/* Busyness Score Detail */}
          <BusynessScore score={data?.busynessScore || 0} />

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
