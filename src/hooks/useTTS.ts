import { useState } from 'react';
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
  const { toast } = useToast();

  const speak = async (text: string) => {
    if (!text || isLoading) return;

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

      audioElement.volume = 0.8;

      audioElement.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
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
        URL.revokeObjectURL(audioUrl);
      };

      audioElement.oncanplaythrough = async () => {
        try {
          await audioElement.play();
          setIsPlaying(true);
          setIsLoading(false);
        } catch (playError) {
          console.error('Error playing audio:', playError);
          setIsPlaying(false);
          setIsLoading(false);
          toast({
            title: "Audio playback failed",
            description: "Could not play audio - check browser permissions",
            variant: "destructive",
          });
        }
      };

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
    setIsPlaying(false);
    // Note: We can't easily stop the current audio without keeping a ref
    // This would require a more complex implementation with useRef
  };

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    currentProvider,
  };
};
