import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const [role, setRole] = useState<'user' | 'hr' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, org_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.org_id) {
          const { data: membership } = await supabase
            .from('org_members')
            .select('role')
            .eq('org_id', profile.org_id)
            .eq('user_id', user.id)
            .maybeSingle();

          setRole((membership?.role || profile?.role || 'user') as 'user' | 'hr');
        } else {
          setRole((profile?.role || 'user') as 'user' | 'hr');
        }
      } catch (error) {
        console.error('Error loading user role:', error);
        setRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserRole();
  }, []);

  return { role, isLoading, isHROrAdmin: role === 'hr' };
};