import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  user_id: string;
  display_name: string;
  avg7_score: number;
  avg_meetings: number;
  avg_after_hours_min: number;
}

interface TeamMemberRowProps {
  member: TeamMember;
}

const getBusynessBand = (score: number) => {
  if (score <= 39) return { label: 'Calm', color: 'bg-green-100 text-green-800 border-green-200' };
  if (score <= 59) return { label: 'Moderate', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  if (score <= 79) return { label: 'Busy', color: 'bg-orange-100 text-orange-800 border-orange-200' };
  return { label: 'Overwhelming', color: 'bg-red-100 text-red-800 border-red-200' };
};

const TeamMemberRow: React.FC<TeamMemberRowProps> = React.memo(({ member }) => {
  const band = getBusynessBand(member.avg7_score);
  
  return (
    <TableRow key={member.user_id}>
      <TableCell className="font-medium">{member.display_name}</TableCell>
      <TableCell>{member.avg7_score}</TableCell>
      <TableCell>
        <Badge variant="outline" className={band.color}>
          {band.label}
        </Badge>
      </TableCell>
      <TableCell>{member.avg_meetings}</TableCell>
    </TableRow>
  );
});

TeamMemberRow.displayName = 'TeamMemberRow';

export default TeamMemberRow;