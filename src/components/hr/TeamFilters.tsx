import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TeamFiltersProps {
  bandFilter: string;
  onBandFilterChange: (value: string) => void;
}

const TeamFilters: React.FC<TeamFiltersProps> = React.memo(({ 
  bandFilter, 
  onBandFilterChange 
}) => {
  return (
    <div className="flex gap-4 mb-6">
      <Select value={bandFilter} onValueChange={onBandFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by stress level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stress levels</SelectItem>
          <SelectItem value="calm">Calm (0-39)</SelectItem>
          <SelectItem value="moderate">Moderate (40-59)</SelectItem>
          <SelectItem value="busy">Busy (60-79)</SelectItem>
          <SelectItem value="overwhelming">Overwhelming (80+)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
});

TeamFilters.displayName = 'TeamFilters';

export default TeamFilters;