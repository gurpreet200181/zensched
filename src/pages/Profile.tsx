
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Profile {
  id: string;
  display_name: string;
  email: string;
  work_start_time: string;
  work_end_time: string;
  timezone: string;
}

interface CalendarIntegration {
  id: string;
  provider: string;
  calendar_url: string;
  is_active: boolean;
  last_sync: string;
  created_at: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calendars, setCalendars] = useState<CalendarIntegration[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadCalendars();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
    } else {
      setProfile(data);
      setDisplayName(data.display_name || '');
    }
  };

  const loadCalendars = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading calendars:', error);
    } else {
      setCalendars(data || []);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setProfile({ ...profile, display_name: displayName });
    }
    setIsLoading(false);
  };

  const addCalendar = async () => {
    if (!newCalendarUrl.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsAddingCalendar(true);
    const { error } = await supabase
      .from('calendar_integrations')
      .insert({
        user_id: user.id,
        provider: 'ics',
        calendar_url: newCalendarUrl,
        is_active: true
      });

    if (error) {
      toast({
        title: "Error adding calendar",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Calendar added",
        description: "Your calendar has been successfully added.",
      });
      setNewCalendarUrl('');
      loadCalendars();
    }
    setIsAddingCalendar(false);
  };

  const deleteCalendar = async (id: string) => {
    const { error } = await supabase
      .from('calendar_integrations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting calendar",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Also delete associated events
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('events')
          .delete()
          .eq('calendar_integration_id', id);
      }

      toast({
        title: "Calendar deleted",
        description: "Calendar and associated events have been removed.",
      });
      loadCalendars();
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Profile Settings</h1>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <Button onClick={updateProfile} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Calendar Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Calendar Integrations
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Calendar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add ICS Calendar</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="calendarUrl">Calendar URL (.ics)</Label>
                      <Input
                        id="calendarUrl"
                        value={newCalendarUrl}
                        onChange={(e) => setNewCalendarUrl(e.target.value)}
                        placeholder="https://example.com/calendar.ics"
                      />
                    </div>
                    <Button 
                      onClick={addCalendar} 
                      disabled={isAddingCalendar || !newCalendarUrl.trim()}
                      className="w-full"
                    >
                      {isAddingCalendar ? 'Adding...' : 'Add Calendar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calendars.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No calendars connected yet.</p>
                <p className="text-sm">Add an ICS calendar to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">
                          {calendar.provider.toUpperCase()} Calendar
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-md">
                          {calendar.calendar_url}
                        </p>
                        <p className="text-xs text-gray-400">
                          Added {new Date(calendar.created_at).toLocaleDateString()}
                          {calendar.last_sync && 
                            ` • Last synced ${new Date(calendar.last_sync).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(calendar.calendar_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCalendar(calendar.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
