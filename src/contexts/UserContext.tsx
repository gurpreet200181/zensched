import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  org_id: string | null;
  share_aggregate_with_org: boolean;
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  role: 'user' | 'hr' | null;
  isLoading: boolean;
  isHROrAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<'user' | 'hr' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (!currentUser) {
        setProfile(null);
        setRole(null);
        return;
      }

      // Load profile and membership in parallel
      const [profileResult, membershipResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single(),
        currentUser ? supabase
          .from('org_members')
          .select('role, org_id')
          .eq('user_id', currentUser.id)
          .maybeSingle() : Promise.resolve({ data: null })
      ]);

      const userProfile = profileResult.data;
      const membership = membershipResult?.data;

      if (userProfile) {
        setProfile(userProfile);
        // Use membership role if available, otherwise use profile role
        const effectiveRole = membership?.role || userProfile.role || 'user';
        setRole(effectiveRole as 'user' | 'hr');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setRole('user');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await loadUserData();
  };

  useEffect(() => {
    loadUserData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          await loadUserData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isHROrAdmin = role === 'hr';

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isHROrAdmin,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};