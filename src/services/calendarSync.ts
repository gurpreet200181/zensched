
import { supabase } from '@/integrations/supabase/client';
import { ICSParser, ICSEvent } from './icsParser';

export class CalendarSyncService {
  static async syncAllUserCalendars(userId: string): Promise<void> {
    try {
      console.log('Starting calendar sync for user:', userId);
      
      // Get all active calendar integrations for the user
      const { data: integrations, error } = await supabase
        .from('calendar_integrations')
        .select('id, user_id, provider, calendar_url, is_active, last_sync')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching calendar integrations:', error);
        return;
      }

      if (!integrations || integrations.length === 0) {
        console.log('No calendar integrations found for user');
        return;
      }

      console.log(`Found ${integrations.length} calendar integrations`);

      // Sync each calendar
      let successCount = 0;
      let errorCount = 0;
      
      for (const integration of integrations) {
        if (integration.provider === 'ics' && integration.calendar_url) {
          try {
            await this.syncICSCalendar(integration);
            successCount++;
          } catch (error) {
            console.error(`Failed to sync calendar ${integration.id}:`, error);
            errorCount++;
          }
        }
      }
      
      console.log(`Sync completed: ${successCount} successful, ${errorCount} failed`);
    } catch (error) {
      console.error('Error syncing calendars:', error);
    }
  }

  static async syncICSCalendar(integration: any): Promise<void> {
    try {
      // Decrypt the calendar URL first
      const { data: decrypted, error: decryptError } = await supabase.functions.invoke('calendar-crypto', {
        body: { action: 'decrypt', data: { encrypted: integration.calendar_url } }
      });
      
      if (decryptError) {
        console.error('Failed to decrypt calendar URL:', decryptError);
        throw new Error('Failed to decrypt calendar URL');
      }

      const decryptedUrl = decrypted.decrypted;
      console.log(`Syncing ICS calendar: ${decryptedUrl.substring(0, 50)}...`);
      const startTime = Date.now();
      
      // Fetch and parse ICS events
      const icsEvents = await ICSParser.fetchAndParseICS(decryptedUrl);
      
      console.log(`Fetched ${icsEvents.length} events in ${Date.now() - startTime}ms`);
      
      if (icsEvents.length === 0) {
        console.log('No events found in ICS calendar - this might be due to fetch failure or empty calendar');
        
        // Update last sync time even if no events (to show we tried)
        await supabase
          .from('calendar_integrations')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', integration.id);
        return;
      }

      // Filter events for a wider range (past 1 month to future 2 months)
      const now = new Date();
      const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const futureTwoMonths = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const relevantEvents = icsEvents.filter(event => 
        event.startTime >= pastMonth && event.startTime <= futureTwoMonths
      );

      console.log(`Filtered to ${relevantEvents.length} relevant events (${pastMonth.toISOString().split('T')[0]} to ${futureTwoMonths.toISOString().split('T')[0]})`);

      // Get existing events for comparison
      const { data: existingEvents } = await supabase
        .from('events')
        .select('external_event_id, title, start_time, end_time')
        .eq('calendar_integration_id', integration.id);

      const existingEventIds = new Set(existingEvents?.map(e => e.external_event_id) || []);
      const newEventIds = new Set(relevantEvents.map(e => e.id));

      // Check if there are actual changes
      const hasNewEvents = relevantEvents.some(e => !existingEventIds.has(e.id));
      const hasRemovedEvents = existingEvents?.some(e => !newEventIds.has(e.external_event_id));
      
      if (!hasNewEvents && !hasRemovedEvents && existingEvents?.length === relevantEvents.length) {
        console.log('No changes detected in calendar events');
        
        // Still update last sync time
        await supabase
          .from('calendar_integrations')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', integration.id);
        return;
      }

      console.log(`Changes detected: ${hasNewEvents ? 'new events' : ''} ${hasRemovedEvents ? 'removed events' : ''}`);

      // Delete existing events for this calendar integration
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('calendar_integration_id', integration.id);

      if (deleteError) {
        console.error('Error deleting existing events:', deleteError);
        throw deleteError;
      }

      // Insert new events
      if (relevantEvents.length > 0) {
        const eventsToInsert = relevantEvents.map(event => ({
          user_id: integration.user_id,
          calendar_integration_id: integration.id,
          external_event_id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          start_time: event.startTime.toISOString(),
          end_time: event.endTime.toISOString(),
          classification: ICSParser.classifyEvent(event.title, event.description),
          attendees_count: event.attendees?.length || 0
        }));

        console.log('Inserting events:', eventsToInsert);

        const { error: insertError } = await supabase
          .from('events')
          .insert(eventsToInsert);

        if (insertError) {
          console.error('Error inserting events:', insertError);
          throw insertError;
        }
      }

      console.log(`Successfully synced ${relevantEvents.length} events`);

      // Update last sync time
      await supabase
        .from('calendar_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', integration.id);

      // Populate daily analytics for the user based on the synced events
      try {
        // Determine a reasonable date range (last 30 days up to today)
        const minStart = new Date(Math.min(...relevantEvents.map(e => e.startTime.getTime())));
        const maxEnd = new Date(Math.max(...relevantEvents.map(e => e.endTime.getTime())));

        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Clamp start to at most 30 days ago, and do not go beyond today
        const analyticsStart = new Date(Math.max(thirtyDaysAgo.getTime(), Math.min(minStart.getTime(), today.getTime())));
        const analyticsEnd = new Date(Math.min(maxEnd.getTime(), today.getTime()));

        if (analyticsStart <= analyticsEnd) {
          console.log('Backfilling daily analytics from', analyticsStart.toISOString().slice(0,10), 'to', analyticsEnd.toISOString().slice(0,10));
          const { error: analyticsError } = await supabase.rpc('populate_daily_analytics_from_events', {
            user_id_param: integration.user_id,
            start_date: analyticsStart.toISOString().slice(0, 10),
            end_date: analyticsEnd.toISOString().slice(0, 10),
          });
          if (analyticsError) {
            console.error('Failed to populate daily analytics:', analyticsError);
          } else {
            console.log('Daily analytics populated successfully');
          }
        } else {
          console.log('Skipping analytics backfill: no past-dated events in range');
        }
      } catch (err) {
        console.error('Error during analytics backfill:', err);
      }

    } catch (error) {
      console.error(`Error syncing ICS calendar ${integration.calendar_url}:`, error);
      throw error; // Re-throw to be caught by the caller
    }
  }
}
