
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDailyNarrative } from '@/hooks/useDailyNarrative';
import { CalendarEvent } from '@/hooks/useCalendarData';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

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
  const [showManualControls, setShowManualControls] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const narrative = useDailyNarrative(busynessScore, events, busyHours, freeHours);

  // Check if we've already played today
  useEffect(() => {
    const today = new Date().toDateString();
    const lastPlayedDate = localStorage.getItem('dailyNarrativeLastPlayed');
    if (lastPlayedDate === today) {
      setHasPlayedToday(true);
    }
    
    // Show manual controls after 3 seconds if auto-play hasn't worked
    const timer = setTimeout(() => {
      if (!hasPlayedToday && !isPlaying) {
        setShowManualControls(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [hasPlayedToday, isPlaying]);

  const generateAndPlayAudio = async () => {
    if (isLoading || !narrative) {
      console.log('Cannot play audio:', { isLoading, hasNarrative: !!narrative });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Generating daily narrative audio...', narrative.substring(0, 100) + '...');
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: narrative,
          voice: '9BWtsMINqrJLrRacOk9x' // Aria voice
        }
      });

      if (error) {
        console.error('Text-to-speech error:', error);
        setError(error.message || 'Failed to generate audio');
        setShowManualControls(true);
        return;
      }

      if (!data?.audioContent) {
        console.error('No audio content received');
        setError('No audio content received');
        setShowManualControls(true);
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
        setShowManualControls(true);
      };

      await audio.play();
      console.log('Daily narrative audio started successfully');
      
    } catch (error) {
      console.error('Error generating daily narrative:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setShowManualControls(true);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    } else {
      generateAndPlayAudio();
    }
  };

  // Auto-play on component mount when conditions are met
  useEffect(() => {
    if (!hasPlayedToday && !isLoading && narrative && events.length >= 0 && !showManualControls) {
      console.log('Attempting to auto-play daily narrative');
      // Small delay to let the dashboard fully load
      const timer = setTimeout(() => {
        generateAndPlayAudio();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [narrative, hasPlayedToday, events.length, showManualControls]);

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

  // Show manual controls if needed
  if (showManualControls || error) {
    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Daily Narrative</h3>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
            <p className="text-sm text-blue-700">
              Click to hear your personalized day overview
            </p>
          </div>
          <Button
            onClick={togglePlayback}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              'Loading...'
            ) : isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Play
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Return null for invisible auto-play mode
  return null;
};

export default DailyNarrative;
