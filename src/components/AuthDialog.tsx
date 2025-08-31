
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Calendar, Link, Mail, Lock, User, ExternalLink } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMode = 'signin' | 'signup' | 'calendar-setup';

interface AuthFormData {
  email: string;
  password: string;
  displayName?: string;
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

  const authForm = useForm<AuthFormData>({
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
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

  const onAuthSubmit = (data: AuthFormData) => {
    console.log('Auth data:', data);
    // TODO: Implement authentication with Supabase
    setMode('calendar-setup');
  };

  const onCalendarSubmit = (data: CalendarSetupData) => {
    console.log('Calendar setup data:', data);
    // TODO: Save calendar settings to Supabase
    onOpenChange(false);
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

                <Button type="submit" className="w-full wellness-button">
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
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
                            Recommended: Real-time sync with your Google Calendar
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Connect Google
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
                  <Button type="submit" className="flex-1 wellness-button">
                    Complete Setup
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
