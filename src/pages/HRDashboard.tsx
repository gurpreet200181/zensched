import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useApiCache } from '@/hooks/useApiCache';
import { useDebounce } from '@/hooks/useDebounce';
import TeamOverviewCards from '@/components/hr/TeamOverviewCards';
import TeamMemberRow from '@/components/hr/TeamMemberRow';
import TeamFilters from '@/components/hr/TeamFilters';

interface TeamMember {
  user_id: string;
  display_name: string;
  avg7_score: number;
  avg_meetings: number;
  avg_after_hours_min: number;
}

const HRDashboard = () => {
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<keyof TeamMember | 'band' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const apiCache = useApiCache<{ team: TeamMember[] }>({ ttl: 2 * 60 * 1000 }); // 2 minute cache
  
  // Debounce filter changes to prevent excessive re-renders
  const debouncedBandFilter = useDebounce(bandFilter, 300);

  const loadTeamHealth = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const cacheKey = 'team-health';
      const data = await apiCache.fetchWithCache(
        cacheKey,
        async () => {
          const { data, error } = await supabase.functions.invoke('hr-endpoints', {
            body: { route: 'team-health', timestamp: Date.now() },
          });
          
          if (error) throw error;
          return data;
        },
        forceRefresh
      );
      
      console.log('Team health response:', data);
      console.log('Individual team member data:', data?.team);
      setTeamData(data?.team || []);
    } catch (error: any) {
      console.error('Error loading team health:', error);
      toast({
        title: "Access denied",
        description: "You don't have permission to view team wellness data. Contact your admin.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  }, [apiCache, toast]);

  useEffect(() => {
    loadTeamHealth();
  }, [loadTeamHealth]);

  const getBusynessBand = useCallback((score: number) => {
    if (score <= 39) return { label: 'Calm', color: 'bg-green-100 text-green-800 border-green-200' };
    if (score <= 59) return { label: 'Moderate', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (score <= 79) return { label: 'Busy', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'Overwhelming', color: 'bg-red-100 text-red-800 border-red-200' };
  }, []);

  const handleSort = useCallback((column: keyof TeamMember | 'band') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const getSortIcon = useCallback((column: keyof TeamMember | 'band') => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="ml-2 h-4 w-4" />
      : <ChevronDown className="ml-2 h-4 w-4" />;
  }, [sortColumn, sortDirection]);

  const sortedAndFilteredTeamData = useMemo(() => {
    return [...teamData.filter((member) => {
      const band = getBusynessBand(member.avg7_score);
      return debouncedBandFilter === 'all' || band.label.toLowerCase() === debouncedBandFilter;
    })].sort((a, b) => {
      if (!sortColumn) return 0;
      
      let aValue: any;
      let bValue: any;
      
      if (sortColumn === 'band') {
        aValue = getBusynessBand(a.avg7_score).label;
        bValue = getBusynessBand(b.avg7_score).label;
      } else {
        aValue = a[sortColumn];
        bValue = b[sortColumn];
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  }, [teamData, debouncedBandFilter, sortColumn, sortDirection, getBusynessBand]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading team wellness data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Team Wellness Dashboard</h1>
            <p className="text-gray-600">
              Aggregate wellness metrics for your team members
            </p>
          </div>
          <Button onClick={() => loadTeamHealth(true)} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <TeamOverviewCards teamData={teamData} />

      {/* Filters */}
      <TeamFilters 
        bandFilter={bandFilter} 
        onBandFilterChange={setBandFilter} 
      />

      {/* Team Table */}
      <div className="wellness-card">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Team Overview</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('display_name')}
                >
                  <div className="flex items-center">
                    Employee
                    {getSortIcon('display_name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="whitespace-normal cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('avg7_score')}
                >
                  <div className="flex items-center">
                    Past 7 day Workload Index Average
                    {getSortIcon('avg7_score')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('band')}
                >
                  <div className="flex items-center">
                    Band
                    {getSortIcon('band')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('avg_meetings')}
                >
                  <div className="flex items-center">
                    Avg Meetings/Day
                    {getSortIcon('avg_meetings')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredTeamData.map((member) => (
                <TeamMemberRow key={member.user_id} member={member} />
              ))}
            </TableBody>
          </Table>
          
          {sortedAndFilteredTeamData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No team members match the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;