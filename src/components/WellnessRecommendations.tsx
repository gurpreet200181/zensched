
import { Plus, Clock, Focus, Calendar, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  actionType: 'ADD_BUFFER' | 'BLOCK_FOCUS' | 'RESCHEDULE_NOTE' | 'PREP_NOTE';
  confidence?: number;
}

interface WellnessRecommendationsProps {
  recommendations: Recommendation[];
  summary?: string;
  aiEnabled?: boolean;
  className?: string;
}

const WellnessRecommendations = ({ 
  recommendations, 
  summary, 
  aiEnabled = false,
  className = "" 
}: WellnessRecommendationsProps) => {
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

  return (
    <div className={`wellness-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-700">Wellness Actions</h3>
        {aiEnabled && (
          <div className="wellness-badge busyness-calm text-xs">
            AI Enhanced
          </div>
        )}
      </div>

      {summary && (
        <div className="bg-calm-gradient p-4 rounded-xl mb-4 border border-calm-200/30">
          <p className="text-sm text-gray-700">{summary}</p>
          <Button 
            variant="ghost" 
            size="sm"
            className="mt-2 text-calm-600 hover:text-calm-700"
          >
            🔊 Listen to summary
          </Button>
        </div>
      )}

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
                    {rec.confidence && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {rec.confidence}% confidence
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
                  
                  <Button 
                    size="sm"
                    className="wellness-button h-8 px-4 text-sm"
                  >
                    Apply Action
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {recommendations.length === 0 && (
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
