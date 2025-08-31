
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDailyNarrative } from '@/hooks/useDailyNarrative';
import { CalendarEvent } from '@/hooks/useCalendarData';

interface DailyNarrativeProps {
  busynessScore: number;
  events: CalendarEvent[];
  busyHours: number;
  freeHours: number;
  autoPlay?: boolean;
}

const DailyNarrative = ({ 
  busynessScore, 
  events, 
  busyHours, 
  freeHours, 
  autoPlay = false 
}: DailyNarrativeProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const narrative = useDailyNarrative(busynessScore, events, busyHours, freeHours);

  // Check if we've already played today's narrative
  useEffect(() => {
    const today = new Date().toDateString();
    const lastPlayed = localStorage.getItem('dailyNarrativeLastPlayed');
    setHasPlayedToday(lastPlayed === today);
  }, []);

  const generateAndPlayAudio = async () => {
    if (isLoading) return;

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
        // Mark as played today
        localStorage.setItem('dailyNarrativeLastPlayed', new Date().toDateString());
        setHasPlayedToday(true);
      };

      await audio.play();
      console.log('Daily narrative playing');
      
    } catch (error) {
      console.error('Error generating daily narrative:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) {
      generateAndPlayAudio();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Auto-play on first visit of the day
  useEffect(() => {
    if (autoPlay && !hasPlayedToday && !isLoading && events.length > 0) {
      // Small delay to let the dashboard load
      const timer = setTimeout(() => {
        generateAndPlayAudio();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [autoPlay, hasPlayedToday, events.length]);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlayback}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm"
      >
        {isLoading ? (
          <VolumeX className="h-4 w-4 animate-pulse" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        {isLoading ? 'Generating...' : isPlaying ? 'Playing Daily Brief' : 'Play Daily Brief'}
      </Button>
    </div>
  );
};

export default DailyNarrative;
