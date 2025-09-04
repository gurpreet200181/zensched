import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTodayData } from '@/hooks/useTodayData';
import { useTTS } from '@/hooks/useTTS';

const DashboardSummary = () => {
  // Check if summary has been played this session (prevents auto-play on every Dashboard visit)
  const [hasPlayed, setHasPlayed] = useState(() => {
    return sessionStorage.getItem('voiceSummaryPlayed') === 'true';
  });
  const { data: todayData, isLoading: dataLoading } = useTodayData();
  const { speak, isLoading, isPlaying } = useTTS();

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
    
    const summaryText = generateSummary(todayData);
    await speak(summaryText);
    setHasPlayed(true);
    // Mark as played for this session so it doesn't auto-play again on Dashboard navigation
    sessionStorage.setItem('voiceSummaryPlayed', 'true');
  };

  // Auto-play only on first Dashboard visit after login (not on subsequent navigation)
  useEffect(() => {
    if (todayData && !hasPlayed && !dataLoading && !isLoading) {
      playAudioSummary();
    }
  }, [todayData, hasPlayed, dataLoading, isLoading]);

  if (dataLoading) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Content removed as requested */}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating...</span>
              </div>
            ) : (
              <Button
                onClick={playAudioSummary}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 border-transparent"
                disabled={isLoading}
              >
                {isPlaying ? (
                  <>
                    <VolumeX className="h-4 w-4" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    Voice Summary: Powered by ElevenLabs
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