import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendarEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  attendees?: Array<{ email: string }>;
  id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, accessToken, user_id } = await req.json();

    if (action === 'sync') {
      if (!accessToken || !user_id) {
        throw new Error('Missing access token or user ID');
      }

      console.log('Starting Google Calendar sync for user:', user_id);

      // Get Google Calendar events
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
        new Date().toISOString() + 
        '&maxResults=250&singleEvents=true&orderBy=startTime',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('Google Calendar API error:', errorText);
        throw new Error(`Google Calendar API error: ${calendarResponse.status}`);
      }

      const calendarData = await calendarResponse.json();
      console.log('Retrieved', calendarData.items?.length || 0, 'events from Google Calendar');

      if (!calendarData.items || calendarData.items.length === 0) {
        console.log('No events found in Google Calendar');
        return new Response(
          JSON.stringify({ success: true, message: 'No events to sync' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already has a Google calendar integration
      const { data: existingIntegration } = await supabase
        .from('calendar_integrations')
        .select('id')
        .eq('user_id', user_id)
        .eq('provider', 'google')
        .single();

      let integrationId: string;

      if (existingIntegration) {
        integrationId = existingIntegration.id;
        console.log('Using existing Google Calendar integration:', integrationId);
        
        // Update last sync time
        await supabase
          .from('calendar_integrations')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', integrationId);
      } else {
        // Create new Google calendar integration
        const { data: newIntegration, error: integrationError } = await supabase
          .from('calendar_integrations')
          .insert({
            user_id: user_id,
            provider: 'google',
            calendar_url: 'https://www.googleapis.com/calendar/v3/calendars/primary',
            is_active: true,
            last_sync: new Date().toISOString(),
          })
          .select()
          .single();

        if (integrationError) {
          console.error('Error creating integration:', integrationError);
          throw integrationError;
        }

        integrationId = newIntegration.id;
        console.log('Created new Google Calendar integration:', integrationId);
      }

      // Delete existing events from this integration to avoid duplicates
      await supabase
        .from('events')
        .delete()
        .eq('calendar_integration_id', integrationId);

      // Process and insert events
      const events = calendarData.items.map((event: CalendarEvent) => {
        const startTime = event.start?.dateTime || event.start?.date;
        const endTime = event.end?.dateTime || event.end?.date;
        
        if (!startTime || !endTime) {
          console.warn('Skipping event without start/end time:', event.summary);
          return null;
        }

        return {
          user_id: user_id,
          calendar_integration_id: integrationId,
          external_event_id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          location: event.location || null,
          attendees_count: event.attendees?.length || 0,
          classification: 'meeting', // Default classification
        };
      }).filter(event => event !== null);

      if (events.length > 0) {
        const { error: eventsError } = await supabase
          .from('events')
          .insert(events);

        if (eventsError) {
          console.error('Error inserting events:', eventsError);
          throw eventsError;
        }

        console.log('Successfully inserted', events.length, 'events');

        // Refresh daily analytics for the last 30 days
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 30);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);

        const { error: analyticsError } = await supabase.rpc('populate_daily_analytics_from_events', {
          user_id_param: user_id,
          start_date: fmt(start),
          end_date: fmt(today),
        });

        if (analyticsError) {
          console.warn('Failed to refresh daily analytics:', analyticsError);
        } else {
          console.log('Successfully refreshed daily analytics');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully synced ${events.length} events from Google Calendar`,
          eventsCount: events.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Google Calendar sync failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});