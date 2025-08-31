
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
  const [autoPlayAttempted, setAutoPlayAttempted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const narrative = useDailyNarrative(busynessScore, events, busyHours, freeHours);

  // Check if we've already played today
  useEffect(() => {
    const today = new Date().toDateString();
    const lastPlayedDate = localStorage.getItem('dailyNarrativeLastPlayed');
    console.log('Checking if played today:', { today, lastPlayedDate });
    if (lastPlayedDate === today) {
      setHasPlayedToday(true);
      setShowManualControls(true);
    }
  }, []);

  const generateAndPlayAudio = async (userInitiated = false) => {
    if (isLoading || !narrative) {
      console.log('Cannot play audio:', { isLoading, hasNarrative: !!narrative });
      return;
    }

    console.log('Generating audio for narrative:', narrative.substring(0, 100) + '...');
    setIsLoading(true);
    setError(null);
    
    try {
      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('play', () => {});
        audioRef.current.removeEventListener('pause', () => {});
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('error', () => {});
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      console.log('Calling text-to-speech function...');
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: narrative,
          voice: '9BWtsMINqrJLrRacOk9x' // Aria voice
        }
      });

      if (error) {
        console.error('Text-to-speech error:', error);
        setError(`Audio generation failed: ${error.message || 'Unknown error'}`);
        setShowManualControls(true);
        return;
      }

      if (!data?.audioContent) {
        console.error('No audio content received from API');
        setError('No audio content received from server');
        setShowManualControls(true);
        return;
      }

      console.log('Received audio content, length:', data.audioContent.length);

      // Convert base64 to blob with proper error handling
      try {
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        console.log('Created audio blob, size:', audioBlob.size, 'bytes');
        
        if (audioBlob.size === 0) {
          throw new Error('Audio blob is empty');
        }
        
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Create and configure audio element
        const audio = new Audio(url);
        audioRef.current = audio;
        
        // Set volume to ensure it's audible
        audio.volume = 0.8;
        
        // Add event listeners
        audio.addEventListener('loadstart', () => {
          console.log('Audio loading started');
        });
        
        audio.addEventListener('canplay', () => {
          console.log('Audio can start playing');
        });
        
        audio.addEventListener('play', () => {
          console.log('Audio started playing');
          setIsPlaying(true);
          setError(null);
        });
        
        audio.addEventListener('pause', () => {
          console.log('Audio paused');
          setIsPlaying(false);
        });
        
        audio.addEventListener('ended', () => {
          console.log('Audio finished playing');
          setIsPlaying(false);
          setHasPlayedToday(true);
          const today = new Date().toDateString();
          localStorage.setItem('dailyNarrativeLastPlayed', today);
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          const errorMsg = audio.error ? `Audio error: ${audio.error.message}` : 'Audio playback failed';
          setError(errorMsg);
          setIsPlaying(false);
          setShowManualControls(true);
        });

        // Load the audio
        console.log('Loading audio...');
        audio.load();
        
        // Wait for audio to be ready before trying to play
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Audio loading timeout'));
          }, 10000);
          
          audio.addEventListener('canplaythrough', () => {
            clearTimeout(timeout);
            resolve(null);
          }, { once: true });
          
          audio.addEventListener('error', () => {
            clearTimeout(timeout);
            reject(new Error('Audio loading failed'));
          }, { once: true });
        });

        // Try to play the audio
        console.log('Attempting to play audio...');
        await audio.play();
        console.log('Audio play successful');
        
      } catch (conversionError) {
        console.error('Audio conversion error:', conversionError);
        setError(`Audio processing failed: ${conversionError.message}`);
        setShowManualControls(true);
        return;
      }
      
    } catch (error) {
      console.error('Error generating daily narrative:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate audio');
      setShowManualControls(true);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        console.log('Pausing audio...');
        audioRef.current.pause();
      } else {
        console.log('Resuming audio playback...');
        audioRef.current.play().catch(error => {
          console.error('Resume play failed:', error);
          setError('Failed to resume audio playback');
        });
      }
    } else {
      console.log('No audio available, generating new audio...');
      generateAndPlayAudio(true);
    }
  };

  // Auto-play attempt on component mount
  useEffect(() => {
    if (!hasPlayedToday && !isLoading && narrative && events.length >= 0 && !autoPlayAttempted) {
      console.log('Setting up auto-play attempt...');
      setAutoPlayAttempted(true);
      
      // Delay auto-play to let the dashboard fully load
      const timer = setTimeout(() => {
        console.log('Attempting auto-play...');
        generateAndPlayAudio(false);
      }, 2000);
      
      // Show manual controls after 5 seconds if auto-play hasn't worked
      const fallbackTimer = setTimeout(() => {
        if (!isPlaying && !hasPlayedToday) {
          console.log('Auto-play failed after 5 seconds, showing manual controls');
          setShowManualControls(true);
        }
      }, 5000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(fallbackTimer);
      };
    }
  }, [narrative, hasPlayedToday, events.length, autoPlayAttempted, isPlaying]);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('play', () => {});
        audioRef.current.removeEventListener('pause', () => {});
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('error', () => {});
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  // Show manual controls if needed
  if (showManualControls || error || hasPlayedToday) {
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
              {hasPlayedToday ? 'Click to replay your day overview' : 'Click to hear your personalized day overview'}
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

  // Return null for invisible auto-play mode (while attempting auto-play)
  return null;
};

export default DailyNarrative;
