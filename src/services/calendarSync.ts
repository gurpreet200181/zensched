
import { supabase } from '@/integrations/supabase/client';
import { ICSParser, ICSEvent } from './icsParser';

export class CalendarSyncService {
  static async syncAllUserCalendars(userId: string): Promise<void> {
    try {
      console.log('Starting calendar sync for user:', userId);
      
      // Get all active calendar integrations for the user
      const { data: integrations, error } = await supabase
        .from('calendar_integrations')
        .select('*')
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
      for (const integration of integrations) {
        if (integration.provider === 'ics' && integration.calendar_url) {
          await this.syncICSCalendar(integration);
        }
      }
    } catch (error) {
      console.error('Error syncing calendars:', error);
    }
  }

  static async syncICSCalendar(integration: any): Promise<void> {
    try {
      console.log(`Syncing ICS calendar: ${integration.calendar_url}`);
      
      // Fetch and parse ICS events
      const icsEvents = await ICSParser.fetchAndParseICS(integration.calendar_url);
      
      if (icsEvents.length === 0) {
        console.log('No events found in ICS calendar');
        return;
      }

      // Filter events for a wider range (past 1 month to future 2 months)
      const now = new Date();
      const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const futureTwoMonths = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const relevantEvents = icsEvents.filter(event => 
        event.startTime >= pastMonth && event.startTime <= futureTwoMonths
      );

      console.log(`Filtered to ${relevantEvents.length} relevant events`);

      if (relevantEvents.length === 0) {
        console.log('No relevant events in date range');
        return;
      }

      // Delete existing events for this calendar integration
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('calendar_integration_id', integration.id);

      if (deleteError) {
        console.error('Error deleting existing events:', deleteError);
      }

      // Insert new events
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
      } else {
        console.log(`Successfully synced ${eventsToInsert.length} events`);
      }

      // Update last sync time
      await supabase
        .from('calendar_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', integration.id);

    } catch (error) {
      console.error(`Error syncing ICS calendar ${integration.calendar_url}:`, error);
    }
  }
}
