
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
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const narrative = useDailyNarrative(busynessScore, events, busyHours, freeHours);

  // Check if we've already played today
  useEffect(() => {
    const today = new Date().toDateString();
    const lastPlayedDate = localStorage.getItem('dailyNarrativeLastPlayed');
    if (lastPlayedDate === today) {
      setHasPlayedToday(true);
    }
  }, []);

  const generateAndPlayAudio = async () => {
    if (isLoading || hasPlayedToday || !narrative) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Generating daily narrative audio...', narrative);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: narrative,
          voice: '9BWtsMINqrJLrRacOk9x' // Aria voice
        }
      });

      if (error) {
        console.error('Text-to-speech error:', error);
        setError(error.message || 'Failed to generate audio');
        return;
      }

      if (!data?.audioContent) {
        console.error('No audio content received');
        setError('No audio content received');
        return;
      }

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
      
      audio.onplay = () => {
        console.log('Daily narrative started playing');
        setIsPlaying(true);
      };
      
      audio.onpause = () => {
        console.log('Daily narrative paused');
        setIsPlaying(false);
      };
      
      audio.onended = () => {
        console.log('Daily narrative finished playing');
        setIsPlaying(false);
        setHasPlayedToday(true);
        // Mark as played today
        const today = new Date().toDateString();
        localStorage.setItem('dailyNarrativeLastPlayed', today);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio');
        setIsPlaying(false);
      };

      await audio.play();
      console.log('Daily narrative audio started successfully');
      
    } catch (error) {
      console.error('Error generating daily narrative:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-play on component mount when conditions are met
  useEffect(() => {
    if (!hasPlayedToday && !isLoading && narrative && events.length >= 0) {
      console.log('Attempting to auto-play daily narrative');
      // Small delay to let the dashboard fully load
      const timer = setTimeout(() => {
        generateAndPlayAudio();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [narrative, hasPlayedToday, events.length]);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  // Show error message if there's an issue (for debugging)
  if (error) {
    console.error('Daily narrative error:', error);
  }

  // Return null - no visible UI, but log status for debugging
  useEffect(() => {
    if (isLoading) {
      console.log('Daily narrative: Loading audio...');
    } else if (isPlaying) {
      console.log('Daily narrative: Playing...');
    } else if (hasPlayedToday) {
      console.log('Daily narrative: Already played today');
    }
  }, [isLoading, isPlaying, hasPlayedToday]);

  return null;
};

export default DailyNarrative;
