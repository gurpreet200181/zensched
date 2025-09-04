import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TTSResponse {
  provider: 'elevenlabs' | 'openai' | 'none';
  audioBase64?: string;
  contentType?: string;
  status: number;
  error?: string;
  detail?: string;
}

export const useTTS = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const audioRef = useRef<{ element: HTMLAudioElement; url: string } | null>(null);
  const { toast } = useToast();

  // Cleanup function
  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.element.pause();
      audioRef.current.element.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.url);
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  // Cleanup on unmount and when user logs out
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        cleanup();
      }
    });

    return () => {
      cleanup();
      subscription.subscription.unsubscribe();
    };
  }, []);

  const speak = async (text: string) => {
    if (!text || isLoading) return;

    // Stop any currently playing audio
    cleanup();
    setIsLoading(true);
    
    try {
      console.log('TTS: Calling edge function with text:', text.slice(0, 50) + '...');
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text }
      });

      console.log('TTS: Function response:', { data, error });

      if (error) {
        console.error('TTS API Error:', error);
        toast({
          title: "Voice synthesis error",
          description: `Unable to generate speech: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = data as TTSResponse;
      console.log('TTS response:', { provider: response.provider, status: response.status, hasAudio: !!response.audioBase64, len: response.audioBase64?.length });
      setCurrentProvider(response.provider);

      if (response.provider === 'none' || !response.audioBase64) {
        // Show info message instead of trying to play non-existent fallback audio
        toast({
          title: "Voice service unavailable",
          description: response.detail || "TTS service is currently disabled",
          variant: "default",
        });
        
        setIsLoading(false);
        return;
      }

      // Decode base64 to audio blob and play
      const byteChars = atob(response.audioBase64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const audioBlob = new Blob([new Uint8Array(byteNums)], { 
        type: response.contentType || 'audio/mpeg' 
      });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);

      // Store audio reference for cleanup
      audioRef.current = { element: audioElement, url: audioUrl };

      audioElement.volume = 0.8;

      audioElement.onended = () => {
        setIsPlaying(false);
        if (audioRef.current) {
          URL.revokeObjectURL(audioRef.current.url);
          audioRef.current = null;
        }
      };

      audioElement.onerror = () => {
        console.error('Audio playback error');
        setIsPlaying(false);
        setIsLoading(false);
        toast({
          title: "Audio playback failed",
          description: "Could not play generated audio",
          variant: "destructive",
        });
        if (audioRef.current) {
          URL.revokeObjectURL(audioRef.current.url);
          audioRef.current = null;
        }
      };

      try {
        await audioElement.play();
        setIsPlaying(true);
      } catch (playError: any) {
        console.error('Error playing audio:', playError);
        setIsPlaying(false);
        toast({
          title: playError?.name === 'NotAllowedError' ? 'Tap to play audio' : 'Audio playback failed',
          description: playError?.name === 'NotAllowedError' 
            ? 'Autoplay was blocked by the browser. Press the Play button to start.'
            : 'Could not play audio - check browser permissions',
          variant: playError?.name === 'NotAllowedError' ? 'default' : 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in TTS:', error);
      toast({
        title: "Voice synthesis failed",
        description: "Failed to generate speech",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const stop = () => {
    cleanup();
  };

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    currentProvider,
  };
};
