
import { Clock, Users, MapPin, Calendar } from 'lucide-react';

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
              className={`p-4 rounded-xl event-${event.classification} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-1 text-gray-600" />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 truncate">{event.title}</h4>
                  
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
                
                <div className={`wellness-badge busyness-${event.classification === 'break' ? 'calm' : event.classification === 'focus' ? 'moderate' : 'busy'} text-xs`}>
                  {event.classification}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventList;
