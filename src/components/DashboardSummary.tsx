import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTodayData } from '@/hooks/useTodayData';

const DashboardSummary = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const { data: todayData, isLoading: dataLoading } = useTodayData();

  const generateSummary = (data: any) => {
    if (!data) return "Welcome to your dashboard! Loading your schedule data...";

    const { score, events, meetingCount, focusMinutes } = data;
    
    let summaryText = "Welcome back! Here's your day overview. ";
    
    // Busyness assessment
    if (score < 40) {
      summaryText += "You have a light schedule today with plenty of flexibility. ";
    } else if (score < 60) {
      summaryText += "Your day looks well-balanced. ";
    } else if (score < 80) {
      summaryText += "You have a busy day ahead. ";
    } else {
      summaryText += "Your schedule is quite packed today. ";
    }

    // Meeting details
    if (meetingCount === 0) {
      summaryText += "No meetings scheduled, perfect for focused work. ";
    } else if (meetingCount === 1) {
      summaryText += "You have one meeting today. ";
    } else {
      summaryText += `You have ${meetingCount} meetings planned. `;
    }

    // Focus time
    if (focusMinutes > 0) {
      const hours = Math.round(focusMinutes / 60 * 10) / 10;
      summaryText += `${hours} hours blocked for focused work. `;
    }

    summaryText += "Have a productive day!";

    return summaryText;
  };

  const playAudioSummary = async () => {
    if (!todayData || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const summaryText = generateSummary(todayData);
      setSummary(summaryText);
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: {
          text: summaryText,
        }
      });

      if (error) {
        console.error('TTS API Error:', error);
        setError('Voice synthesis temporarily unavailable');
        setIsLoading(false);
        return;
      }

      if (data?.audioBase64) {
        // Convert base64 back to audio blob
        const byteChars = atob(data.audioBase64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i);
        }
        const audioBlob = new Blob([new Uint8Array(byteNums)], { type: data.contentType || 'audio/mpeg' });
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
        console.error('TTS failed:', data?.detail || 'No audio content received');
        setError('Voice synthesis failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error playing summary:', error);
      setError('Failed to generate voice summary');
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Auto-play when data is available
  useEffect(() => {
    if (todayData && !hasPlayed && !dataLoading && !isLoading && !error) {
      playAudioSummary();
    }
  }, [todayData, hasPlayed, dataLoading, isLoading, error]);

  if (dataLoading) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">Daily Summary</h3>
            <p className="text-sm text-muted-foreground">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : isPlaying ? (
                "Playing your daily summary..."
              ) : hasPlayed ? (
                "Summary complete"
              ) : isLoading ? (
                "Preparing your daily summary..."
              ) : (
                "Ready to play your daily summary"
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating...</span>
              </div>
            ) : (
              <Button
                onClick={isPlaying ? stopAudio : playAudioSummary}
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
                    {hasPlayed ? "Play Again" : "Play Summary"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardSummary;