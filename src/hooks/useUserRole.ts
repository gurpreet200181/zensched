import { useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';

export const useUserRole = () => {
  const { role, isLoading, isHROrAdmin } = useUser();
  
  return useMemo(() => ({
    role,
    isLoading,
    isHROrAdmin
  }), [role, isLoading, isHROrAdmin]);
};