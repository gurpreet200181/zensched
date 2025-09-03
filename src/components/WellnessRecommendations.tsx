
import { Plus, Clock, Focus, Calendar, Lightbulb, Brain, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  actionType: 'ADD_BUFFER' | 'BLOCK_FOCUS' | 'RESCHEDULE_NOTE' | 'PREP_NOTE';
  confidence?: number;
  params?: Record<string, any>;
}

interface WellnessRecommendationsProps {
  recommendations: Recommendation[];
  summary?: string;
  aiEnabled?: boolean;
  aiLoading?: boolean;
  className?: string;
}

const WellnessRecommendations = ({ 
  recommendations, 
  summary, 
  aiEnabled = false,
  aiLoading = false,
  className = "" 
}: WellnessRecommendationsProps) => {
  const [userCalendarUrl, setUserCalendarUrl] = useState<string | null>(null);

  // Get user's calendar integration on component mount
  useEffect(() => {
    const getUserCalendar = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data: integrations } = await supabase
          .from('calendar_integrations')
          .select('calendar_url')
          .eq('user_id', sessionData.session.user.id)
          .eq('is_active', true)
          .limit(1);

        if (integrations && integrations.length > 0 && integrations[0].calendar_url) {
          // Extract email from ICS URL to construct Google Calendar URL
          const icsUrl = integrations[0].calendar_url;
          const emailMatch = icsUrl.match(/ical\/([^\/]+)%40/);
          if (emailMatch) {
            const email = emailMatch[1] + '@' + icsUrl.split('%40')[1].split('/')[0];
            setUserCalendarUrl(`https://calendar.google.com/calendar/u/0/r?cid=${email}`);
          }
        }
      } catch (error) {
        console.error('Error fetching user calendar:', error);
      }
    };

    getUserCalendar();
  }, []);
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'ADD_BUFFER': return Clock;
      case 'BLOCK_FOCUS': return Focus;
      case 'RESCHEDULE_NOTE': return Calendar;
      case 'PREP_NOTE': return Lightbulb;
      default: return Plus;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'ADD_BUFFER': return 'text-yellow-600 bg-yellow-50';
      case 'BLOCK_FOCUS': return 'text-purple-600 bg-purple-50';
      case 'RESCHEDULE_NOTE': return 'text-blue-600 bg-blue-50';
      case 'PREP_NOTE': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleApplyAction = (recommendation: Recommendation) => {
    // Show toast with action details
    toast.success(`Redirecting to calendar to apply: ${recommendation.title}`, {
      description: "You'll be taken to your calendar to make the recommended changes.",
    });
    
    // Open user's specific calendar or fallback to default
    const calendarUrl = userCalendarUrl || 'https://calendar.google.com/calendar/u/0/r';
    window.open(calendarUrl, '_blank');
  };

  return (
    <div className={`wellness-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-700">Wellness Actions</h3>
          {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
        {aiEnabled && (
          <div className="wellness-badge busyness-calm text-xs flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI Enhanced
          </div>
        )}
      </div>

      {summary && (
        <div className="bg-calm-gradient p-4 rounded-xl mb-4 border border-calm-200/30">
          <p className="text-sm text-gray-700">{summary}</p>
        </div>
      )}

      {aiLoading && (
        <div className="text-center py-8 text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
          <p>AI is analyzing your schedule...</p>
          <p className="text-sm">Generating personalized recommendations</p>
        </div>
      )}

      {!aiLoading && (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const Icon = getActionIcon(rec.actionType);
            const colorClass = getActionColor(rec.actionType);
            
            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-800">{rec.title}</h4>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
                    
                    <Button 
                      size="sm"
                      className="wellness-button h-8 px-4 text-sm flex items-center gap-1"
                      onClick={() => handleApplyAction(rec)}
                    >
                      Apply Action
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!aiLoading && recommendations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Your schedule looks well-balanced!</p>
          <p className="text-sm">No wellness actions needed right now.</p>
        </div>
      )}
    </div>
  );
};

export default WellnessRecommendations;
