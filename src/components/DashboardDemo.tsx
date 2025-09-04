
import { Calendar, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WorkloadIndex from './WorkloadIndex';
import EventList from './EventList';
import WellnessRecommendations from './WellnessRecommendations';
import AnalyticsChart from './AnalyticsChart';

const DashboardDemo = () => {
  // Sample data
  const sampleEvents = [
    {
      id: '1',
      title: 'Team Standup',
      startTime: '09:00',
      endTime: '09:30',
      classification: 'meeting' as const,
      attendees: 6,
      location: 'Conference Room A'
    },
    {
      id: '2',
      title: 'Deep Work: Project Planning',
      startTime: '10:00',
      endTime: '12:00',
      classification: 'focus' as const
    },
    {
      id: '3',
      title: 'Lunch Break',
      startTime: '12:00',
      endTime: '13:00',
      classification: 'break' as const
    },
    {
      id: '4',
      title: 'Client Presentation',
      startTime: '14:00',
      endTime: '15:00',
      classification: 'meeting' as const,
      attendees: 4,
      location: 'Zoom'
    },
    {
      id: '5',
      title: 'Doctor Appointment',
      startTime: '16:30',
      endTime: '17:30',
      classification: 'personal' as const,
      location: 'Medical Center'
    }
  ];

  const sampleRecommendations = [
    {
      id: 'rec1',
      title: 'Add 15-min buffer before client meeting',
      reason: 'Your deep work session ends right before an important presentation.',
      actionType: 'ADD_BUFFER' as const,
      confidence: 85
    },
    {
      id: 'rec2',
      title: 'Schedule 30-min focus block',
      reason: 'You have a 2-hour gap after the client meeting - perfect for focused work.',
      actionType: 'BLOCK_FOCUS' as const,
      confidence: 92
    }
  ];

  const chartData = [
    { day: 'Mon', meetings: 4, busyness: 65 },
    { day: 'Tue', meetings: 6, busyness: 78 },
    { day: 'Wed', meetings: 3, busyness: 45 },
    { day: 'Thu', meetings: 5, busyness: 72 },
    { day: 'Fri', meetings: 2, busyness: 35 },
  ];

  return (
    <div className="min-h-screen bg-wellness-gradient">
      {/* Navigation */}
      <nav className="border-b border-white/20 bg-white/40 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold gradient-text">ZenSched</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="wellness-badge busyness-moderate">
                Last synced 2 min ago • Live
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Today</h2>
              <p className="text-gray-600">Tuesday, December 31, 2024</p>
            </div>
            <Button variant="ghost" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Connected to Google Calendar
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <WorkloadIndex score={58} />
            <EventList events={sampleEvents} />
            
            {/* Analytics Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <AnalyticsChart data={chartData} type="bar" />
              <AnalyticsChart data={chartData} type="line" />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <WellnessRecommendations 
              recommendations={sampleRecommendations}
              summary="You have 4 meetings before lunch; your best focus window is 14:00–16:30."
              aiEnabled={true}
            />
            
            {/* Quick Stats */}
            <div className="wellness-card p-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Week Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Meetings</span>
                  <span className="font-semibold">23</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Meeting Hours</span>
                  <span className="font-semibold">14.5h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Busyness</span>
                  <span className="font-semibold">59%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">After Hours</span>
                  <span className="font-semibold text-orange-600">12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardDemo;
