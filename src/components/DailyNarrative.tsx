
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDailyNarrative } from '@/hooks/useDailyNarrative';
import { CalendarEvent } from '@/hooks/useCalendarData';

interface DailyNarrativeProps {
  busynessScore: number;
  events: CalendarEvent[];
  busyHours: number;
  freeHours: number;
}

const DailyNarrative = ({ 
  busynessScore, 
  events, 
  busyHours, 
  freeHours
}: DailyNarrativeProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPlayedThisSession, setHasPlayedThisSession] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const narrative = useDailyNarrative(busynessScore, events, busyHours, freeHours);

  const generateAndPlayAudio = async () => {
    if (isLoading || hasPlayedThisSession) return;

    setIsLoading(true);
    try {
      console.log('Generating daily narrative audio...');
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: narrative,
          voice: '9BWtsMINqrJLrRacOk9x' // Aria voice
        }
      });

      if (error) throw error;

      // Convert base64 to blob and create URL
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Create and play audio
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        setHasPlayedThisSession(true);
      };

      await audio.play();
      console.log('Daily narrative playing automatically');
      
    } catch (error) {
      console.error('Error generating daily narrative:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-play on component mount (when user logs in and visits dashboard)
  useEffect(() => {
    if (!hasPlayedThisSession && !isLoading && events.length >= 0) {
      // Small delay to let the dashboard load
      const timer = setTimeout(() => {
        generateAndPlayAudio();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [events.length, hasPlayedThisSession]);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Return null - no visible UI
  return null;
};

export default DailyNarrative;
