import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarSyncService } from '@/services/calendarSync';
import { useQueryClient } from '@tanstack/react-query';

/**
 * useLiveSync
 * - Polling: 1 min when visible; pause when hidden; backoff to 5 min after 10 cycles
 * - Fallback ICS timer: 15 min
 * - Push-ready: subscribes to 'sync_signals' inserts for current user (if table/publication exist)
 * - After each sync: invalidates calendar + analytics queries
 */
export function useLiveSync() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [pollingMs, setPollingMs] = useState<number>(60_000); // 1 minute
  const [isPushActive, setIsPushActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(document.visibilityState !== 'visible');
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);
  const isSyncingRef = useRef(false);
  const idlePollCountRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const icsIntervalRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Load current session user
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => {
      authSub.subscription.unsubscribe();
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (isPaused) return 'Sync: Paused (hidden)';
    const baseStatus = pollingMs >= 300_000 ? 'Sync: Auto (5 min polling)' : 'Sync: Auto (1 min polling)';
    if (lastSyncResult === 'error') return `${baseStatus} - Error`;
    return baseStatus;
  }, [isPaused, pollingMs, lastSyncResult]);

  async function doSync(reason: string) {
    if (!userId) return;
    if (isSyncingRef.current) {
      console.log(`[sync] already in progress, skipping (${reason})`);
      return;
    }
    
    isSyncingRef.current = true;
    console.log(`[sync] start (${reason}) with user ${userId}`);

    try {
      await CalendarSyncService.syncAllUserCalendars(userId);

      // Invalidate queries so UI refreshes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calendar-data'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics-7d'] }),
      ]);

      // Reset idle counter on sync completion (treat as potential change)
      idlePollCountRef.current = 0;
      // Keep polling interval at 1 minute after any sync; backoff logic will increase again if idle
      if (pollingMs !== 60_000) {
        setPollingMs(60_000);
      }
      
      setLastSyncResult('success');
      console.log(`[sync] completed successfully (${reason})`);
    } catch (error) {
      console.error(`[sync] failed (${reason}):`, error);
      setLastSyncResult('error');
      
      // Don't reset idle counter on error, but also don't increase it too aggressively
      // This prevents getting stuck in long polling intervals due to temporary errors
    } finally {
      isSyncingRef.current = false;
    }
  }

  // Visibility and online state handlers
  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState !== 'visible';
      setIsPaused(hidden);
      if (!hidden) {
        // Resume at 1 min with immediate sync
        setPollingMs(60_000);
        idlePollCountRef.current = 0;
        doSync('visibilitychange');
      } else {
        // Pause timers handled by conditional in timers effect
        console.log('[sync] paused due to hidden tab');
      }
    };

    const onOnline = () => {
      if (!isPaused) {
        setPollingMs(60_000);
        idlePollCountRef.current = 0;
        doSync('online');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [isPaused, pollingMs, userId]);

  // Main polling timer - improved with better error recovery
  useEffect(() => {
    if (isPaused || !userId) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval and start new with current pollingMs
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    // Immediate sync on (re)start
    doSync('poll-start');

    intervalRef.current = window.setInterval(async () => {
      // On each tick, sync then increase idle counter and maybe backoff
      await doSync('poll-tick');
      
      // Only increase idle counter if sync was successful
      if (lastSyncResult === 'success') {
        idlePollCountRef.current += 1;
        if (idlePollCountRef.current >= 10 && pollingMs !== 300_000) {
          console.log('[sync] idle detected, backing off to 5 min');
          setPollingMs(300_000);
        }
      }
    }, pollingMs);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pollingMs, isPaused, userId, lastSyncResult]);

  // ICS fallback timer (15 minutes)
  useEffect(() => {
    if (!userId) return;
    if (icsIntervalRef.current) {
      window.clearInterval(icsIntervalRef.current);
      icsIntervalRef.current = null;
    }
    icsIntervalRef.current = window.setInterval(() => {
      if (!isPaused) {
        doSync('ics-fallback-15m');
      }
    }, 15 * 60_000);

    return () => {
      if (icsIntervalRef.current) {
        window.clearInterval(icsIntervalRef.current);
        icsIntervalRef.current = null;
      }
    };
  }, [userId, isPaused]);

  // Optional push via Realtime: listen to sync_signals table inserts for current user
  useEffect(() => {
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('sync_signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_signals',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[sync] push signal received:', payload);
          setPollingMs(60_000);
          idlePollCountRef.current = 0;
          doSync('push-signal');
        }
      )
      .subscribe((status) => {
        const active = status === 'SUBSCRIBED';
        setIsPushActive(active);
        console.log('[sync] realtime subscription status:', status);
        return undefined;
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsPushActive(false);
      }
    };
  }, [userId]);

  return {
    statusLabel,
    pollingMs,
    isPushActive,
    lastSyncResult,
    forceSync: () => doSync('manual'),
  };
}
