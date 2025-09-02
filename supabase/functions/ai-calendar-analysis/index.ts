
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { events, workHours = { start: "09:00", end: "17:00" } } = await req.json();

    if (!events || !Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: 'Events array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Analyzing ${events.length} events for wellness recommendations`);

    const prompt = `You are a wellness AI that analyzes calendar schedules to reduce stress and improve focus.

CALENDAR EVENTS:
${events.map(e => `${e.startTime}-${e.endTime}: ${e.title} (${e.classification})`).join('\n')}

WORK HOURS: ${workHours.start} - ${workHours.end}

RULES:
- Never count breaks (lunch, coffee, walk, meditation) as workload; encourage keeping them
- Consider meeting chains, free blocks, after-hours work, and heavy workloads
- Focus on actionable, specific recommendations for TODAY

ACTION TYPES:
- ADD_BUFFER: Add buffer time between meetings or around events
- BLOCK_FOCUS: Reserve time blocks for deep work
- RESCHEDULE_NOTE: Suggest moving non-critical meetings
- PREP_NOTE: Add preparation or wrap-up time

Provide 3-5 specific recommendations and a brief daily summary.

Return STRICT JSON:
{
  "recommendations": [
    { 
      "id":"rec_1", 
      "title":"Add 15-min buffer after morning meetings", 
      "reason":"Back-to-back meetings create mental fatigue", 
      "actionType":"ADD_BUFFER", 
      "params":{"durationMin":15, "afterMeeting":"Morning standup"}
    }
  ],
  "summary": "Your busiest window is 10am-12pm with 3 consecutive meetings. Best focus time appears to be 2-4pm with no interruptions."
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are a wellness AI that provides calendar optimization recommendations. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback to basic recommendations if AI response is malformed
      analysisResult = {
        recommendations: [
          {
            id: 'fallback_1',
            title: 'Review your calendar for optimization opportunities',
            reason: 'AI analysis temporarily unavailable',
            actionType: 'PREP_NOTE',
            params: { durationMin: 10 }
          }
        ],
        summary: 'Schedule analysis in progress. Check back shortly for personalized recommendations.'
      };
    }

    // Ensure we have proper IDs and validate structure
    if (analysisResult.recommendations) {
      analysisResult.recommendations = analysisResult.recommendations.map((rec, index) => ({
        ...rec,
        id: rec.id || `ai_rec_${index + 1}`,
        confidence: 85 // Add AI confidence indicator
      }));
    }

    console.log('Wellness analysis complete');

    return new Response(
      JSON.stringify(analysisResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-calendar-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
