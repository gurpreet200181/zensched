
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Calendar, ExternalLink, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  work_start_time: string;
  work_end_time: string;
  timezone: string;
  role: 'user' | 'hr';
  org_id: string | null;
  share_aggregate_with_org: boolean;
}

interface Organization {
  id: string;
  name: string;
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('none');
  const [newOrgName, setNewOrgName] = useState('');
  const [shareWithOrg, setShareWithOrg] = useState(false);
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadCalendars();
    loadOrganizations();
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
      const profileData = data as Profile;
      setProfile(profileData);
      setDisplayName(profileData.display_name || '');
      setSelectedOrgId(profileData.org_id || 'none');
      setShareWithOrg(profileData.share_aggregate_with_org || false);

      // Ensure membership exists if profile has an org_id but no membership row
      try {
        if (profileData.org_id) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { data: existingMember } = await supabase
              .from('org_members')
              .select('user_id')
              .eq('org_id', profileData.org_id)
              .eq('user_id', currentUser.id)
              .maybeSingle();

            if (!existingMember) {
              await supabase.from('org_members').insert({
                org_id: profileData.org_id,
                user_id: currentUser.id,
                role: (profileData.role || 'user') as 'user' | 'hr',
              });
            }
          }
        }
      } catch (e) {
        console.error('Error ensuring org membership:', e);
      }

      // Refresh organizations after ensuring membership
      loadOrganizations();
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
      // Decrypt URLs for display
      const calendarsWithDecryptedUrls = await Promise.all(
        (data || []).map(async (calendar) => {
          try {
            const { data: decrypted, error: decryptError } = await supabase.functions.invoke('calendar-crypto', {
              body: { action: 'decrypt', data: { encrypted: calendar.calendar_url } }
            });
            if (decryptError) throw decryptError;
            return { ...calendar, calendar_url: decrypted.decrypted };
          } catch (error) {
            console.error('Error decrypting calendar URL:', error);
            return { ...calendar, calendar_url: '[Encrypted URL]' };
          }
        })
      );
      setCalendars(calendarsWithDecryptedUrls);
    }
  };

  const loadOrganizations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Load all organizations for selection dropdown
    const { data: orgs, error } = await supabase
      .from('orgs')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error loading organizations:', error);
      setOrganizations([]);
    } else {
      setOrganizations(orgs || []);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsCreatingOrg(true);
    
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .insert({ name: newOrgName })
        .select()
        .single();

      if (orgError) throw orgError;

      // Join as hr  
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'hr'
        });

      if (memberError) throw memberError;

      toast({
        title: "Organization created",
        description: "You've been added as HR manager.",
      });
      
      setNewOrgName('');
      setSelectedOrgId(org.id);
      loadOrganizations();
    } catch (error: any) {
      toast({
        title: "Error creating organization",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsCreatingOrg(false);
  };

  const updateProfile = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update profile with all fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName,
          org_id: selectedOrgId === 'none' ? null : selectedOrgId,
          share_aggregate_with_org: shareWithOrg,
          work_start_time: profile.work_start_time,
          work_end_time: profile.work_end_time
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update or create organization membership if org selected
      if (selectedOrgId && selectedOrgId !== 'none') {
        const { data: existing } = await supabase
          .from('org_members')
          .select('*')
          .eq('org_id', selectedOrgId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existing) {
          const { error: memberError } = await supabase
            .from('org_members')
            .insert({
              org_id: selectedOrgId,
              user_id: user.id,
              role: 'user'
            });

          if (memberError) throw memberError;
        }
      }

      toast({
        title: "Profile updated",
        description: "All profile information has been successfully updated.",
      });
      
      setProfile({
        ...profile,
        display_name: displayName,
        org_id: selectedOrgId === 'none' ? null : selectedOrgId,
        share_aggregate_with_org: shareWithOrg
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const addCalendar = async () => {
    if (!newCalendarUrl.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsAddingCalendar(true);
    
    try {
      // Encrypt URL before storing
      const { data: encrypted, error: encryptError } = await supabase.functions.invoke('calendar-crypto', {
        body: { action: 'encrypt', data: { url: newCalendarUrl } }
      });
      
      if (encryptError) throw encryptError;

      const { error } = await supabase
        .from('calendar_integrations')
        .insert({
          user_id: user.id,
          provider: 'ics',
          calendar_url: encrypted.encrypted,
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
        setIsCalendarDialogOpen(false);
        loadCalendars();
      }
    } catch (error: any) {
      toast({
        title: "Error adding calendar",
        description: error.message || "Failed to encrypt calendar URL",
        variant: "destructive"
      });
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile Settings</h1>
        {!profile?.display_name && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Welcome!</strong> Complete your profile setup below to get started with calendar tracking and wellness insights.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

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
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={profile?.role || 'user'}
                disabled
                className="bg-gray-50 capitalize"
              />
              <p className="text-xs text-gray-500 mt-1">
                Contact your admin to change your role
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Working Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workStart">Start Time</Label>
                <Input
                  id="workStart"
                  type="time"
                  value={profile?.work_start_time || '09:00'}
                  onChange={(e) => {
                    if (profile) {
                      setProfile({
                        ...profile,
                        work_start_time: e.target.value
                      });
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="workEnd">End Time</Label>
                <Input
                  id="workEnd"
                  type="time"
                  value={profile?.work_end_time || '17:00'}
                  onChange={(e) => {
                    if (profile) {
                      setProfile({
                        ...profile,
                        work_end_time: e.target.value
                      });
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Calendar Integrations
              <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={calendars.length > 0}>
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
                        type="password"
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
                          ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Calendar</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this calendar? This action cannot be undone and will remove all associated events.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteCalendar(calendar.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="organization">Organization</Label>
              <div className="flex gap-2">
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No organization</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Organization</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input
                          id="orgName"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Enter organization name"
                        />
                      </div>
                      <Button 
                        onClick={createOrganization} 
                        disabled={isCreatingOrg || !newOrgName.trim()}
                        className="w-full"
                      >
                        {isCreatingOrg ? 'Creating...' : 'Create Organization'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button 
            onClick={updateProfile} 
            disabled={isLoading}
            className="px-8 py-2 wellness-button"
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
