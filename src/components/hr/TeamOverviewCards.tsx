import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, AlertTriangle } from 'lucide-react';

interface TeamMember {
  user_id: string;
  display_name: string;
  avg7_score: number;
  avg_meetings: number;
  avg_after_hours_min: number;
}

interface TeamOverviewCardsProps {
  teamData: TeamMember[];
}

const getBusynessBand = (score: number) => {
  if (score <= 39) return { label: 'Calm', color: 'bg-green-100 text-green-800 border-green-200' };
  if (score <= 59) return { label: 'Moderate', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  if (score <= 79) return { label: 'Busy', color: 'bg-orange-100 text-orange-800 border-orange-200' };
  return { label: 'Overwhelming', color: 'bg-red-100 text-red-800 border-red-200' };
};

const TeamOverviewCards: React.FC<TeamOverviewCardsProps> = React.memo(({ teamData }) => {
  const avgBusyness = React.useMemo(() => {
    return teamData.length > 0 
      ? Math.round(teamData.reduce((sum, m) => sum + m.avg7_score, 0) / teamData.length)
      : 0;
  }, [teamData]);

  const highStressCount = React.useMemo(() => {
    return teamData.filter(m => m.avg7_score >= 80).length;
  }, [teamData]);

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Size</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{teamData.length}</div>
          <p className="text-xs text-muted-foreground">
            Total team members
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Workload</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgBusyness}</div>
          <p className="text-xs text-muted-foreground">
            {getBusynessBand(avgBusyness).label} level
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Stress</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{highStressCount}</div>
          <p className="text-xs text-muted-foreground">
            Members with overwhelming workload
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

TeamOverviewCards.displayName = 'TeamOverviewCards';

export default TeamOverviewCards;