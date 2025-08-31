
import { Clock, Users, MapPin, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  classification: 'meeting' | 'focus' | 'break' | 'personal' | 'travel' | 'buffer';
  attendees?: number;
  location?: string;
}

interface EventListProps {
  events: Event[];
  className?: string;
}

const EventList = ({ events, className = "" }: EventListProps) => {
  const getEventIcon = (classification: string) => {
    switch (classification) {
      case 'meeting': return Users;
      case 'focus': return Calendar;
      case 'break': return Clock;
      case 'personal': return MapPin;
      case 'travel': return MapPin;
      case 'buffer': return Clock;
      default: return Calendar;
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'meeting': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'focus': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'break': return 'bg-green-100 text-green-700 border-green-200';
      case 'personal': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'travel': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'buffer': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2024-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`wellness-card p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-700 mb-4">Today's Schedule</h3>
      
      <div className="space-y-3">
        {events.map((event) => {
          const Icon = getEventIcon(event.classification);
          
          return (
            <div
              key={event.id}
              className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-md bg-white"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-1 text-gray-600" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-800 truncate">{event.title}</h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium ${getClassificationColor(event.classification)}`}
                    >
                      {event.classification}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </span>
                    
                    {event.attendees && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.attendees}
                      </span>
                    )}
                    
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No events scheduled for today</p>
          <p className="text-sm">Enjoy your free time!</p>
        </div>
      )}
    </div>
  );
};

export default EventList;
