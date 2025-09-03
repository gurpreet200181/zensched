
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KEY_PRIMARY = Deno.env.get('ELEVENLABS_API_KEY') || '';
const KEY_FALLBACK = Deno.env.get('ELEVENLABS_API_KEY_V2') || '';
const ACTIVE_KEY = KEY_PRIMARY || KEY_FALLBACK;

// Debug: Check all environment variables and key presence (length only)
console.log('All env vars:', Object.keys(Deno.env.toObject()));
console.log('ELEVENLABS_API_KEY present:', KEY_PRIMARY.length > 0, 'len:', KEY_PRIMARY.length);
console.log('ELEVENLABS_API_KEY_V2 present:', KEY_FALLBACK.length > 0, 'len:', KEY_FALLBACK.length);
console.log('GROQ_API_KEY exists:', !!Deno.env.get('GROQ_API_KEY'));

// Voice ID mapping
const VOICE_MAP: { [key: string]: string } = {
  'Aria': '9BWtsMINqrJLrRacOk9x',
  'Roger': 'CwhRBWXzGAHq8TQ4Fs17',
  'Sarah': 'EXAVITQu4vr4xnSDxMaL',
  'Laura': 'FGY2WhTYpPnrIDTdsKH5',
  'Charlie': 'IKne3meq5aSn9XLyUdCD',
  'Alice': 'Xb7hH8MSUJpSbSDYk0k2'
};

serve(async (req) => {
  console.log('ElevenLabs TTS function invoked'); // Force redeployment
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!ACTIVE_KEY) {
    console.error('No ElevenLabs API key found in ELEVENLABS_API_KEY or ELEVENLABS_API_KEY_V2');
    return new Response(
      JSON.stringify({ 
        error: 'ElevenLabs API key not configured',
        details: {
          ELEVENLABS_API_KEY_present: !!Deno.env.get('ELEVENLABS_API_KEY'),
          ELEVENLABS_API_KEY_V2_present: !!Deno.env.get('ELEVENLABS_API_KEY_V2'),
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  console.log('Using ElevenLabs key from:', KEY_PRIMARY ? 'ELEVENLABS_API_KEY' : (KEY_FALLBACK ? 'ELEVENLABS_API_KEY_V2' : 'none'));
  console.log('Active key length:', ACTIVE_KEY.length);

  try {
    const { text, voice = 'Sarah' } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Generating TTS for text: "${text.substring(0, 50)}..." with voice: ${voice}`);

    // Get voice ID, fallback to Sarah if voice not found
    const voiceId = VOICE_MAP[voice] || VOICE_MAP['Sarah'];

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ACTIVE_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`);
    }

    // Convert audio to base64 using a more efficient method
    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Audio = btoa(binary);

    console.log('TTS generation successful');

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in elevenlabs-tts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
