
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import BusynessScore from '@/components/BusynessScore';
import EventList from '@/components/EventList';
import WellnessRecommendations from '@/components/WellnessRecommendations';
import SyncStatusBadge from '@/components/SyncStatusBadge';
import DailyNarrative from '@/components/DailyNarrative';
import { useCalendarData } from '@/hooks/useCalendarData';
import ElevenLabsTTSTest from '@/components/ElevenLabsTTSTest';

const Dashboard = () => {
  const [busynessScore, setBusynessScore] = useState(0);
  const { data, isLoading, error } = useCalendarData();

  // Extract data with defaults
  const events = data?.events || [];
  const recommendations = data?.recommendations || [];

  useEffect(() => {
    if (events && events.length > 0) {
      // Calculate busyness score based on the number of events
      const newScore = Math.min(events.length * 10, 100);
      setBusynessScore(newScore);
    } else {
      setBusynessScore(0);
    }
  }, [events]);

  // Calculate busy periods
  const busyPeriods = events?.map(event => ({
    start: new Date(`2024-01-01T${event.startTime}`),
    end: new Date(`2024-01-01T${event.endTime}`),
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error loading dashboard</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Daily Narrative */}
      <DailyNarrative 
        busynessScore={busynessScore}
        events={events}
        busyHours={busyPeriods.length}
        freeHours={24 - busyPeriods.length}
      />
      
      {/* Calendar Sync Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Wellness Dashboard</h1>
          <p className="text-gray-600 mt-1">Today's schedule insights and recommendations</p>
        </div>
        <SyncStatusBadge status="connected" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Busyness Score */}
          <BusynessScore 
            score={busynessScore}
          />

          {/* Today's Events */}
          <EventList events={events} />
        </div>

        {/* Right Column - Recommendations */}
        <div className="space-y-6">
          <WellnessRecommendations 
            recommendations={recommendations}
          />
        </div>
      </div>

      {/* ElevenLabs TTS Test Section */}
      <div className="mt-12">
        <div className="flex justify-center">
          <ElevenLabsTTSTest />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
