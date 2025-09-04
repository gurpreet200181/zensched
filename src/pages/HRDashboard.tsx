import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, Clock, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TeamMember {
  user_id: string;
  display_name: string;
  avg7_score: number;
  avg_meetings: number;
  avg_after_hours_min: number;
}

interface DailyAnalytic {
  day: string;
  busyness_score: number;
  meeting_count: number;
  after_hours_min: number;
  largest_free_min: number;
}

const HRDashboard = () => {
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<DailyAnalytic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<keyof TeamMember | 'band' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  useEffect(() => {
    loadTeamHealth();
  }, []);

  const loadTeamHealth = async () => {
    setIsLoading(true);
    try {
      // Add timestamp to bypass any caching
      const { data, error } = await supabase.functions.invoke('hr-endpoints', {
        body: { route: 'team-health', timestamp: Date.now() },
      });
      
      if (error) throw error;
      
      console.log('Team health response:', data);
      console.log('Individual team member data:', data?.team);
      setTeamData((data as any)?.team || []);
    } catch (error: any) {
      console.error('Error loading team health:', error);
      toast({
        title: "Access denied",
        description: "You don't have permission to view team wellness data. Contact your admin.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const loadUserHealth = async (userId: string) => {
    try {
      console.log('Loading user health for UUID:', userId);
      const { data, error } = await supabase.functions.invoke('hr-endpoints', {
        body: { route: 'user-health', userId },
      });
      
      if (error) throw error;
      
      console.log('User health data received:', data);
      console.log('Analytics days array:', (data as any)?.days);
      setUserAnalytics((data as any)?.days || []);
    } catch (error: any) {
      console.error('Error loading user health:', error);
      toast({
        title: "Error loading user data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getBusynessBand = (score: number) => {
    if (score <= 39) return { label: 'Calm', color: 'bg-green-100 text-green-800 border-green-200' };
    if (score <= 59) return { label: 'Moderate', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (score <= 79) return { label: 'Busy', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'Overwhelming', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  const handleRowClick = (member: TeamMember) => {
    setSelectedUser(member);
    loadUserHealth(member.user_id);
    setIsUserDrawerOpen(true);
  };

  const handleSort = (column: keyof TeamMember | 'band') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof TeamMember | 'band') => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="ml-2 h-4 w-4" />
      : <ChevronDown className="ml-2 h-4 w-4" />;
  };

  const sortedAndFilteredTeamData = [...teamData.filter((member) => {
    const band = getBusynessBand(member.avg7_score);
    return bandFilter === 'all' || band.label.toLowerCase() === bandFilter;
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

  const avgBusyness = teamData.length > 0 
    ? Math.round(teamData.reduce((sum, m) => sum + m.avg7_score, 0) / teamData.length)
    : 0;
  const highStressCount = teamData.filter(m => m.avg7_score >= 80).length;

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
          <Button onClick={loadTeamHealth} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
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

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={bandFilter} onValueChange={setBandFilter}>
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

      {/* Team Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
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
              {sortedAndFilteredTeamData.map((member) => {
                const band = getBusynessBand(member.avg7_score);
                return (
                  <TableRow 
                    key={member.user_id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(member)}
                  >
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
              })}
            </TableBody>
          </Table>
          
          {sortedAndFilteredTeamData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No team members match the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Drawer */}
      <Sheet open={isUserDrawerOpen} onOpenChange={setIsUserDrawerOpen}>
        <SheetContent className="w-[600px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {selectedUser?.display_name} - 7-Day Wellness Trend
            </SheetTitle>
          </SheetHeader>
          
          {selectedUser && (
            <div className="mt-6 space-y-6">
              {/* Current Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedUser.avg7_score}</div>
                    <p className="text-sm text-gray-600">7-Day Average</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedUser.avg_meetings}</div>
                    <p className="text-sm text-gray-600">Avg Meetings/Day</p>
                  </CardContent>
                </Card>
              </div>

              {/* Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Workload Trend (7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userAnalytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value, name) => [value, 'Workload Index']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="busyness_score" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Meeting Count Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Meetings (7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userAnalytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day"
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value, name) => [value, 'Meeting Count']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="meeting_count" 
                          stroke="hsl(var(--secondary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HRDashboard;