
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Calendar, Link, Mail, Lock, User, ExternalLink, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMode = 'signin' | 'signup' | 'calendar-setup';

interface AuthFormData {
  email: string;
  password: string;
  displayName?: string;
  role?: 'user' | 'hr';
  timezone?: string;
}

interface CalendarSetupData {
  googleCalendar: boolean;
  icsUrls: string[];
  workStart: string;
  workEnd: string;
}

const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [icsUrls, setIcsUrls] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const { toast } = useToast();

  const authForm = useForm<AuthFormData>({
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      role: 'user',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const calendarForm = useForm<CalendarSetupData>({
    defaultValues: {
      googleCalendar: false,
      icsUrls: [''],
      workStart: '09:00',
      workEnd: '17:00',
    },
  });

  const onAuthSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`,
              data: {
                display_name: data.displayName,
                role: data.role,
                timezone: data.timezone
              }
            }
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive"
            });
            setMode('signin');
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive"
            });
          }
        } else {
          setPendingUser(authData.user);
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link. Please complete the calendar setup below.",
          });
          setMode('calendar-setup');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "Successfully signed in.",
          });
          onOpenChange(false);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCalendarSubmit = async (data: CalendarSetupData) => {
    if (!pendingUser) {
      toast({
        title: "Error",
        description: "No user session found. Please sign up again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update work hours in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          work_start_time: data.workStart,
          work_end_time: data.workEnd,
        })
        .eq('user_id', pendingUser.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Save ICS calendar integrations
      const validIcsUrls = data.icsUrls.filter(url => url.trim() !== '');
      if (validIcsUrls.length > 0) {
        // Encrypt URLs before storing
        const encryptedUrls = await Promise.all(
          validIcsUrls.map(async (url) => {
            const { data: encrypted, error } = await supabase.functions.invoke('calendar-crypto', {
              body: { action: 'encrypt', data: { url } }
            });
            if (error) throw error;
            return encrypted.encrypted;
          })
        );

        const calendarIntegrations = encryptedUrls.map((encryptedUrl, index) => ({
          user_id: pendingUser.id,
          provider: 'ics',
          calendar_url: encryptedUrl,
          is_active: true
        }));

        const { error: calendarError } = await supabase
          .from('calendar_integrations')
          .insert(calendarIntegrations);

        if (calendarError) {
          console.error('Error saving calendar integrations:', calendarError);
          toast({
            title: "Warning",
            description: "Calendar setup partially failed. You can add calendars later in your profile.",
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Setup complete!",
        description: "Your account and calendar preferences have been saved.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Calendar setup error:', error);
      toast({
        title: "Error",
        description: "Failed to save calendar settings. You can add them later in your profile.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addIcsUrl = () => {
    setIcsUrls([...icsUrls, '']);
  };

  const removeIcsUrl = (index: number) => {
    setIcsUrls(icsUrls.filter((_, i) => i !== index));
  };

  const updateIcsUrl = (index: number, value: string) => {
    const newUrls = [...icsUrls];
    newUrls[index] = value;
    setIcsUrls(newUrls);
    // Update form data as well
    calendarForm.setValue('icsUrls', newUrls);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {mode === 'signin' || mode === 'signup' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
              </DialogTitle>
            </DialogHeader>

            <Form {...authForm}>
              <form onSubmit={authForm.handleSubmit(onAuthSubmit)} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <FormField
                      control={authForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={authForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Your Role
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">Employee</SelectItem>
                              <SelectItem value="hr">HR Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            This determines your access level in the application
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={authForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="your@email.com" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={authForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full wellness-button" disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Next'}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {mode === 'signup' ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signin')}
                        className="text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-primary hover:underline"
                      >
                        Sign up
                      </button>
                    </>
                  )}
                </div>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Connect Your Calendar
              </DialogTitle>
            </DialogHeader>

            <Form {...calendarForm}>
              <form onSubmit={calendarForm.handleSubmit(onCalendarSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Calendar Sources</Label>
                    
                    {/* Google Calendar Option */}
                    <div className="wellness-card p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Google Calendar</h4>
                          <p className="text-sm text-muted-foreground">
                            Coming soon: Real-time sync with your Google Calendar
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 text-xs"
                            disabled
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Connect Google (Coming Soon)
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* ICS URL Option */}
                    <div className="wellness-card p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-secondary/50 rounded-lg flex items-center justify-center mt-0.5">
                          <Link className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">ICS Calendar URLs</h4>
                          <p className="text-sm text-muted-foreground">
                            Add calendar feeds from Outlook, Apple Calendar, or other services
                          </p>
                          
                          <div className="space-y-2 mt-3">
                            {icsUrls.map((url, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  placeholder="https://calendar.example.com/feed.ics"
                                  value={url}
                                  onChange={(e) => updateIcsUrl(index, e.target.value)}
                                  className="text-xs"
                                />
                                {icsUrls.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeIcsUrl(index)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addIcsUrl}
                              className="text-xs"
                            >
                              Add Another URL
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Work Hours */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Work Hours</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={calendarForm.control}
                        name="workStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={calendarForm.control}
                        name="workEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">End Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode('signup')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 wellness-button" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Complete Setup'}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
