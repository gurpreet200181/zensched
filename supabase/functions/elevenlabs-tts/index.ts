import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidateVars = ['ELEVENLABS_API_KEY', 'XI_API_KEY', 'ELEVEN_LABS_API_KEY'];
    const resolved: Array<{ name: string; value: string | undefined }> = candidateVars.map(name => ({ name, value: Deno.env.get(name)?.trim() }));
    const found = resolved.find(r => r.value);
    const apiKey = found?.value;

    if (!apiKey) {
      console.log('ElevenLabs API key not found in any env var', {
        checked: resolved.map(r => ({ name: r.name, present: Boolean(r.value) }))
      });
      return new Response(
        JSON.stringify({
          provider: 'none',
          status: 200,
          detail: 'Missing ElevenLabs API key. Set ELEVENLABS_API_KEY or XI_API_KEY in Supabase Function secrets.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using ElevenLabs API key from', found?.name);

    // Use Aria voice (voice ID: 9BWtsMINqrJLrRacOk9x)
    const voiceId = '9BWtsMINqrJLrRacOk9x';

    console.log('ElevenLabs TTS request', { textLen: text.length, voiceId });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 20000); // 20s timeout

    let response: Response;
    try {
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=0`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            output_format: 'mp3_44100_128',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
          signal: controller.signal,
        });
    } catch (e) {
      clearTimeout(timeout);
      const aborted = (e as any)?.name === 'AbortError' || String(e).includes('timeout');
      console.error('ElevenLabs fetch error', e);
      return new Response(
        JSON.stringify({
          provider: 'none',
          status: aborted ? 504 : 502,
          error: aborted ? 'TTS provider timeout' : 'TTS provider fetch failed',
          detail: String(e),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    clearTimeout(timeout);

    console.log('ElevenLabs response', { ok: response.ok, status: response.status, type: response.type });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({
          provider: 'none',
          status: response.status,
          error: `ElevenLabs API error: ${response.status}`,
          detail: errorText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    const audioBase64 = base64Encode(audioBytes);
    console.log('ElevenLabs audio ready', { bytes: audioBytes.length, b64Len: audioBase64.length });

    return new Response(
      JSON.stringify({
        provider: 'elevenlabs',
        audioBase64,
        contentType: 'audio/mpeg',
        status: 200
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('TTS function error:', error);
    return new Response(
      JSON.stringify({
        provider: 'none',
        status: 500,
        error: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});