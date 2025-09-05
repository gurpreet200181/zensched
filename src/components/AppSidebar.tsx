
import { Calendar, BarChart3, User, LogOut, Home, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import zenschedLogo from "@/assets/zensched-logo.png";

export function AppSidebar() {
  const { toast } = useToast();
  const location = useLocation();
  const { isHROrAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Initialize current user ID on mount
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    
    initializeUser();
  }, []);

  // Listen for auth state changes and clear cache when user changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null;
      
      if (currentUserId !== newUserId) {
        // Clear all caches when user changes
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        queryClient.invalidateQueries({ queryKey: ['current-user'] });
        setCurrentUserId(newUserId);
      }
    });

    return () => subscription.unsubscribe();
  }, [currentUserId, queryClient]);

  // Use React Query to fetch user profile data directly with auth user
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', currentUserId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      return profile;
    },
    staleTime: 1000 * 60 * 2, // Reduced to 2 minutes for better responsiveness
    enabled: !!currentUserId,
  });

  const menuItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Analytics', url: '/analytics', icon: BarChart3 },
    { title: 'Profile', url: '/profile', icon: User },
    ...(isHROrAdmin ? [{ title: 'Team Wellness', url: '/hr', icon: Users }] : []),
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    }
  };

  return (
    <Sidebar className="w-64">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <img src={zenschedLogo} alt="ZenSched Logo" className="w-10 h-10" />
          <h1 className="text-xl font-bold gradient-text">ZenSched</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {/* User Profile Section */}
        {userProfile && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={userProfile.avatar_url || ''} 
                alt={userProfile.display_name || 'User'} 
              />
              <AvatarFallback className="text-sm">
                {userProfile.display_name 
                  ? userProfile.display_name.charAt(0).toUpperCase() 
                  : <User className="h-5 w-5" />
                }
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile.display_name || 'User'}
              </p>
            </div>
          </div>
        )}
        
        {/* Sign Out Button */}
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
