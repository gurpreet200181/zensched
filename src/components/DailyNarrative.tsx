
import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useTodayData } from '@/hooks/useTodayData';

const DailyNarrative = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNarrative, setFallbackNarrative] = useState<string | null>(null);
  const { data: todayData, isLoading: dataLoading } = useTodayData();

  const generateNarrative = (data: any) => {
    if (!data) return "Welcome back! Loading your schedule...";

    const { score, events, meetingCount, focusMinutes } = data;
    
    let narrative = "Good morning! Here's your day ahead. ";
    
    // Busyness assessment
    if (score < 40) {
      narrative += "You have a calm day with plenty of breathing room. ";
    } else if (score < 60) {
      narrative += "Your day looks well-balanced with a good mix of work and free time. ";
    } else if (score < 80) {
      narrative += "You have a busy day ahead, but it's manageable. ";
    } else {
      narrative += "Your schedule is quite packed today. Consider prioritizing your most important tasks. ";
    }

    // Meeting details
    if (meetingCount === 0) {
      narrative += "You have no meetings scheduled, making it perfect for deep work. ";
    } else if (meetingCount === 1) {
      narrative += "You have one meeting scheduled. ";
    } else {
      narrative += `You have ${meetingCount} meetings planned. `;
    }

    // Focus time
    if (focusMinutes > 0) {
      const hours = Math.round(focusMinutes / 60 * 10) / 10;
      narrative += `You've blocked ${hours} hours for focused work. `;
    }

    // Events summary
    if (events.length > 0) {
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      narrative += `Your day starts at ${firstEvent.startTime} and ends around ${lastEvent.endTime}. `;
    }

    // Motivational close
    if (score < 60) {
      narrative += "Make the most of your balanced schedule today!";
    } else {
      narrative += "Remember to take breaks and stay focused. You've got this!";
    }

    return narrative;
  };

  const playNarrative = async () => {
    if (!todayData || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const narrative = generateNarrative(todayData);
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: {
          text: narrative,
        }
      });

      if (error) {
        console.error('TTS API Error:', error);
        setError('Voice synthesis temporarily unavailable');
        setFallbackNarrative(narrative);
        // Play local fallback sound if available
        try {
          const fallbackAudio = new Audio('/fallback/summary.mp3');
          fallbackAudio.volume = 0.6;
          fallbackAudio.play().catch(() => {});
        } catch {}
        setIsLoading(false);
        return;
      }

      if (data?.audioBase64) {
        // Convert base64 back to audio blob
        const binaryString = atob(data.audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: data.contentType || 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioElement = new Audio(audioUrl);

        audioElement.volume = 0.8;

        audioElement.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };

        audioElement.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsPlaying(false);
          setIsLoading(false);
          setError('Audio playback failed');
          URL.revokeObjectURL(audioUrl);
        };

        audioElement.oncanplaythrough = async () => {
          try {
            await audioElement.play();
            setIsPlaying(true);
            setHasPlayed(true);
            setIsLoading(false);
          } catch (playError) {
            console.error('Error playing audio:', playError);
            setIsPlaying(false);
            setIsLoading(false);
            setError('Could not play audio - check browser permissions');
          }
        };

        setAudio(audioElement);
      } else {
        setError('No audio content received');
        setFallbackNarrative(narrative);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error playing narrative:', error);
      setError('Failed to generate voice briefing');
      setFallbackNarrative(generateNarrative(todayData));
      setIsLoading(false);
    }
  };

  const stopNarrative = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Auto-play immediately when data is available
  useEffect(() => {
    if (todayData && !hasPlayed && !dataLoading && !isLoading && !error) {
      console.log('Auto-playing daily narrative...');
      playNarrative();
    }
  }, [todayData, hasPlayed, dataLoading, isLoading, error]);

  if (dataLoading) {
    return null;
  }

  return (
    <div className="wellness-card p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-1">Daily Briefing</h3>
          <p className="text-sm text-gray-600">
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : isPlaying ? (
              "Playing your daily briefing..."
            ) : hasPlayed ? (
              "Briefing complete"
            ) : isLoading ? (
              "Preparing your daily briefing..."
            ) : (
              "Ready to play your daily briefing"
            )}
          </p>
          {fallbackNarrative && (
            <p className="mt-2 text-sm text-gray-700">{fallbackNarrative}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating...</span>
            </div>
          ) : (
            <Button
              onClick={isPlaying ? stopNarrative : playNarrative}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!!error && !hasPlayed}
            >
              {isPlaying ? (
                <>
                  <VolumeX className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  {hasPlayed ? "Play Again" : "Play Briefing"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyNarrative;
