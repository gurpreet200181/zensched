import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const DEFAULT_VOICE_ID = Deno.env.get('ELEVEN_VOICE_ID') || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
const DEFAULT_MODEL_ID = Deno.env.get('ELEVEN_MODEL_ID') || 'eleven_turbo_v2_5';

// Simple in-memory cache with 15-minute TTL
const cache = new Map<string, { data: any; expires: number }>();

const generateCacheKey = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getCachedResult = (key: string) => {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  if (cached) {
    cache.delete(key); // Remove expired entry
  }
  return null;
};

const setCachedResult = (key: string, data: any) => {
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
  cache.set(key, { data, expires });
};

const synthElevenLabs = async (text: string, voiceId: string): Promise<any> => {
  const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  try {
    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: DEFAULT_MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { 
        error: 'ElevenLabs error', 
        status: response.status, 
        detail: errorText || 'Voice synthesis failed' 
      };
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    return {
      provider: 'elevenlabs',
      audioBase64,
      contentType: 'audio/mpeg',
      status: 200
    };
  } catch (error) {
    return {
      error: 'ElevenLabs request failed',
      status: 500,
      detail: error.message
    };
  }
};

const synthOpenAI = async (text: string): Promise<any> => {
  if (!OPENAI_API_KEY) {
    return {
      error: 'OpenAI API key not available',
      status: 500,
      detail: 'OpenAI fallback unavailable'
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        error: 'OpenAI TTS error',
        status: response.status,
        detail: errorText || 'OpenAI TTS failed'
      };
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    return {
      provider: 'openai',
      audioBase64,
      contentType: 'audio/mpeg',
      status: 200
    };
  } catch (error) {
    return {
      error: 'OpenAI request failed',
      status: 500,
      detail: error.message
    };
  }
};

serve(async (req) => {
  console.log('TTS function called:', req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('TTS: Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('TTS: Invalid method:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('TTS: Processing POST request');

  try {
    const body = await req.json();
    console.log('TTS: Request body received:', { textLength: body.text?.length });
    const { text, voiceId } = body;

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trim text to 300 characters max
    const trimmedText = text.slice(0, 300);
    console.log('TTS: Processing text:', trimmedText.slice(0, 50) + '...');
    
    // Check cache first
    const cacheKey = await generateCacheKey(trimmedText);
    const cachedResult = getCachedResult(cacheKey);
    
    if (cachedResult) {
      console.log('TTS hit', { provider: cachedResult.provider, status: cachedResult.status, cached: true });
      return new Response(
        JSON.stringify(cachedResult),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Try ElevenLabs with retry and fallback logic
    let result = null;
    
    if (ELEVENLABS_API_KEY) {
      // Try VOICE_A (primary voice)
      const primaryVoice = voiceId || DEFAULT_VOICE_ID;
      result = await synthElevenLabs(trimmedText, primaryVoice);
      
      // If failed with 429/5xx or temporarily unavailable, retry once
      if (result.error && (result.status === 429 || result.status >= 500 || 
          result.detail?.includes('temporarily unavailable'))) {
        console.log('ElevenLabs primary failed, retrying after 300ms...');
        await new Promise(resolve => setTimeout(resolve, 300));
        result = await synthElevenLabs(trimmedText, primaryVoice);
        
        // If still failing, try VOICE_B (Rachel as fallback)
        if (result.error && primaryVoice !== '21m00Tcm4TlvDq8ikWAM') {
          console.log('ElevenLabs primary still failed, trying Rachel voice...');
          result = await synthElevenLabs(trimmedText, '21m00Tcm4TlvDq8ikWAM');
        }
      }
    }
    
    // If ElevenLabs failed, try OpenAI fallback
    if (!result || result.error) {
      console.log('ElevenLabs failed, trying OpenAI fallback...');
      result = await synthOpenAI(trimmedText);
    }
    
    // If everything failed
    if (!result || result.error) {
      const failureResult = {
        provider: 'none',
        error: 'TTS unavailable',
        status: 503,
        detail: result?.detail || 'All TTS providers failed'
      };
      console.log('TTS hit', failureResult);
      return new Response(
        JSON.stringify(failureResult),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Cache successful result
    setCachedResult(cacheKey, result);
    
    console.log('TTS hit', { provider: result.provider, status: result.status, cached: false });
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('TTS: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});