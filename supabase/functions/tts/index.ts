
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for voices
let voicesCache: { data: any[], timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryFetch(url: string, options: any, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.log(`Attempt ${attempt + 1} failed with ${response.status}, retrying in ${backoffMs}ms`);
          await sleep(backoffMs);
          continue;
        }
      }
      
      return response;
    } catch (error) {
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`Attempt ${attempt + 1} failed with error, retrying in ${backoffMs}ms:`, error);
        await sleep(backoffMs);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`[${requestId}] ${req.method} ${new URL(req.url).pathname}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const defaultVoiceId = Deno.env.get('ELEVENLABS_VOICE_ID') || '9BWtsMINqrJLrRacOk9x'; // Aria
    
    if (!elevenLabsApiKey) {
      console.error(`[${requestId}] Missing ELEVENLABS_API_KEY environment variable`);
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured', status: 500 }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    // Health check endpoint
    if (pathname === '/health' && req.method === 'GET') {
      console.log(`[${requestId}] Health check - API key present: ${!!elevenLabsApiKey}`);
      return new Response(
        JSON.stringify({ ok: true, hasKey: !!elevenLabsApiKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get voices endpoint
    if (pathname === '/voices' && req.method === 'GET') {
      // Check cache
      if (voicesCache && (Date.now() - voicesCache.timestamp) < CACHE_DURATION) {
        console.log(`[${requestId}] Returning cached voices (${voicesCache.data.length} voices)`);
        return new Response(
          JSON.stringify(voicesCache.data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const response = await retryFetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'xi-api-key': elevenLabsApiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${requestId}] ElevenLabs voices API error: ${response.status} - ${errorText}`);
          
          if (response.status === 401 || response.status === 403) {
            return new Response(
              JSON.stringify({ error: 'Invalid or unauthorized API key', status: response.status }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ error: `Failed to fetch voices: ${response.status}`, status: response.status }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        const simplifiedVoices = data.voices.map((voice: any) => ({
          id: voice.voice_id,
          name: voice.name,
        }));

        // Update cache
        voicesCache = {
          data: simplifiedVoices,
          timestamp: Date.now(),
        };

        console.log(`[${requestId}] Fetched and cached ${simplifiedVoices.length} voices`);
        return new Response(
          JSON.stringify(simplifiedVoices),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error(`[${requestId}] Error fetching voices:`, error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch voices', status: 500 }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Text-to-speech endpoint
    if (req.method === 'POST') {
      const body = await req.json();
      const { 
        text, 
        voiceId = defaultVoiceId, 
        modelId = 'eleven_multilingual_v2',
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0,
        useSpeakerBoost = true
      } = body;

      // Validate input
      if (!text || typeof text !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Text is required and must be a string', status: 400 }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Text cannot be empty', status: 400 }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (trimmedText.length > 5000) {
        return new Response(
          JSON.stringify({ error: 'Text must be 5000 characters or less', status: 400 }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${requestId}] Generating speech for ${trimmedText.length} characters with voice ${voiceId}`);

      try {
        const ttsResponse = await retryFetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: trimmedText,
              model_id: modelId,
              voice_settings: {
                stability,
                similarity_boost: similarityBoost,
                style,
                use_speaker_boost: useSpeakerBoost,
              },
            }),
          }
        );

        const duration = Date.now() - startTime;
        console.log(`[${requestId}] ElevenLabs API response: ${ttsResponse.status} (${duration}ms)`);

        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text();
          console.error(`[${requestId}] ElevenLabs TTS API error: ${ttsResponse.status} - ${errorText}`);
          
          let errorMessage = 'Failed to generate speech';
          if (ttsResponse.status === 401 || ttsResponse.status === 403) {
            errorMessage = 'Invalid or unauthorized API key';
          } else if (ttsResponse.status === 422 || ttsResponse.status === 400) {
            errorMessage = 'Invalid params (text too long or unsupported)';
          } else if (ttsResponse.status === 429) {
            errorMessage = 'Rate limited—try again in a minute';
          }
          
          return new Response(
            JSON.stringify({ error: errorMessage, status: ttsResponse.status }),
            { status: ttsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        
        if (audioBuffer.byteLength === 0) {
          console.error(`[${requestId}] Empty audio buffer received`);
          return new Response(
            JSON.stringify({ error: 'No audio received', status: 500 }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[${requestId}] Generated ${audioBuffer.byteLength} bytes of audio`);

        return new Response(audioBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-store',
          },
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${requestId}] Error generating speech (${duration}ms):`, error);
        return new Response(
          JSON.stringify({ error: 'Failed to generate speech', status: 500 }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed', status: 405 }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Unexpected error (${duration}ms):`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', status: 500 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
