
import { Clock, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface WorkloadIndexProps {
  score: number;
  className?: string;
}

const WorkloadIndex = ({ score, className = "" }: WorkloadIndexProps) => {
  const getBusynessLevel = (score: number) => {
    if (score < 40) return { level: 'calm', label: 'Calm', icon: CheckCircle };
    if (score < 60) return { level: 'moderate', label: 'Moderate', icon: Clock };
    if (score < 80) return { level: 'busy', label: 'Busy', icon: Activity };
    return { level: 'overwhelming', label: 'Overwhelming', icon: AlertTriangle };
  };

  const { level, label, icon: Icon } = getBusynessLevel(score);

  return (
    <div className={`wellness-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-700">Workload Index</h3>
        <Icon className="h-5 w-5 text-gray-500" />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-700">{score}</span>
          </div>
          <div className={`absolute inset-0 rounded-full border-4 ${
            level === 'calm' ? 'border-green-400' :
            level === 'moderate' ? 'border-blue-400' :
            level === 'busy' ? 'border-orange-400' :
            'border-red-400'
          }`}
               style={{
                 background: `conic-gradient(from 0deg, hsl(var(--busyness-${level})) ${score * 3.6}deg, transparent ${score * 3.6}deg)`,
                 WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), white calc(100% - 4px))',
                 mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), white calc(100% - 4px))'
               }}>
          </div>
        </div>
        
        <div className="flex-1">
          <div className={`wellness-badge busyness-${level} mb-2`}>
            {label}
          </div>
          <p className="text-sm text-gray-600">
            {score < 40 && "You have a well-balanced day ahead with plenty of breathing room."}
            {score >= 40 && score < 60 && "Your day has a good balance of work and free time."}
            {score >= 60 && score < 80 && "Your schedule is quite full. Consider adding buffer time."}
            {score >= 80 && "Your day is very packed. Try to reschedule non-essential meetings."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkloadIndex;
