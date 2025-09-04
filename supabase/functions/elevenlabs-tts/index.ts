import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Secrets and defaults
const ELEVEN_API_KEY = Deno.env.get('ELEVEN_API_KEY') || Deno.env.get('ELEVENLABS_API_KEY') || '';
const DEFAULT_VOICE_ID = Deno.env.get('ELEVEN_VOICE_ID') || '21m00Tcm4TlvDq8ikWAM';
const DEFAULT_MODEL_ID = Deno.env.get('ELEVEN_MODEL_ID') || 'eleven_turbo_v2_5';

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!ELEVEN_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ElevenLabs API key not configured. Set ELEVEN_API_KEY in Supabase Function secrets.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { text, voiceId, modelId } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trim text to 500 characters max
    const trimmedText = text.slice(0, 500);

    const resolvedVoiceId = (voiceId && String(voiceId).trim()) || DEFAULT_VOICE_ID;
    const resolvedModelId = (modelId && String(modelId).trim()) || DEFAULT_MODEL_ID;

    const elevenURL = `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`;

    const elevenResp = await fetch(elevenURL, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_API_KEY,
      },
      body: JSON.stringify({
        text: trimmedText,
        model_id: resolvedModelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
    });

    // If ElevenLabs returns error, propagate structured JSON
    if (!elevenResp.ok) {
      const detail = await elevenResp.text().catch(() => '');
      const status = elevenResp.status;
      console.error('ElevenLabs API error:', status, detail);
      return new Response(
        JSON.stringify({ error: 'ElevenLabs error', status, detail }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert audio to base64
    const audioBuffer = await elevenResp.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    return new Response(
      JSON.stringify({ audioBase64, contentType: 'audio/mpeg' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error in elevenlabs-tts function:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});