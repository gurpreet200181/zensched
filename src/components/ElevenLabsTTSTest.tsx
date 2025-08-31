import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronDown, Download, Volume2, CheckCircle, Play, Pause, VolumeX } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Voice {
  id: string;
  name: string;
}

interface TTSSettings {
  text: string;
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

const ElevenLabsTTSTest = () => {
  const [settings, setSettings] = useState<TTSSettings>({
    text: '',
    voiceId: '9BWtsMINqrJLrRacOk9x', // Default Aria voice
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
  });
  
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; hasKey: boolean } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const maxChars = 5000;
  const remainingChars = maxChars - settings.text.length;

  // Default voices list as fallback
  const defaultVoices = [
    { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria (Default)' },
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
  ];

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('elevenlabs-tts-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error('Failed to load saved settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('elevenlabs-tts-settings', JSON.stringify(settings));
  }, [settings]);

  // Check health on mount
  useEffect(() => {
    checkHealth();
    loadVoices();
  }, []);

  const checkHealth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tts/health');
      if (error) {
        console.error('Health check error:', error);
        setHealthStatus({ ok: false, hasKey: false });
      } else {
        setHealthStatus(data);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({ ok: false, hasKey: false });
    }
  };

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    setVoicesError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('tts/voices');
      
      if (error) {
        console.error('Error loading voices:', error);
        setVoicesError("Couldn't load voices; using default voices.");
        setVoices(defaultVoices);
        return;
      }
      
      if (Array.isArray(data)) {
        setVoices(data);
      } else {
        console.error('Invalid voices response format:', data);
        setVoicesError("Couldn't load voices; using default voices.");
        setVoices(defaultVoices);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      setVoicesError("Couldn't load voices; using default voices.");
      setVoices(defaultVoices);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const generateSpeech = async () => {
    const trimmedText = settings.text.trim();
    
    if (!trimmedText) {
      toast({
        title: "Error",
        description: "Please enter some text to convert to speech.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedText.length > maxChars) {
      toast({
        title: "Error",
        description: `Text is too long. Maximum ${maxChars} characters allowed.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Clean up previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setIsPlaying(false);
      }

      const payload = {
        text: trimmedText,
        voiceId: settings.voiceId || '9BWtsMINqrJLrRacOk9x',
        stability: settings.stability,
        similarityBoost: settings.similarityBoost,
        style: settings.style,
        useSpeakerBoost: settings.useSpeakerBoost,
      };

      console.log("[TTS] Invoking function with payload:", payload);

      // Call the function using fetch with the correct Supabase URL
      const response = await fetch(`https://wqjwklwlvdwwntnukfwm.supabase.co/functions/v1/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxandrbHdsdmR3d250bnVrZndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDUwMzEsImV4cCI6MjA3MjIyMTAzMX0.x17dHGruyLypuyVAr_mweofF9JBb1ccljWJkcGA0UNg`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log("[TTS] Response status:", response.status);
      console.log("[TTS] Response headers:", response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS generation error:', errorText);
        toast({
          title: "Error",
          description: "Failed to generate speech",
          variant: "destructive",
        });
        return;
      }

      // Check if response is actually audio
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('audio/mpeg')) {
        // Response is audio data
        const audioBuffer = await response.arrayBuffer();
        console.log("[TTS] Received audio buffer, size:", audioBuffer.byteLength);
        
        if (audioBuffer.byteLength === 0) {
          console.error("[TTS] Empty audio buffer received");
          toast({
            title: "Error",
            description: "Empty audio file generated",
            variant: "destructive",
          });
          return;
        }

        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        console.log("[TTS] Created blob URL:", url, "blob size:", audioBlob.size);
        
        setAudioUrl(url);

        // Test if the audio can load
        if (audioRef.current) {
          audioRef.current.load();
        }

        toast({
          title: "Success",
          description: "Speech generated successfully!",
        });
      } else {
        // Response might be JSON with error
        const text = await response.text();
        console.error('Unexpected response:', text);
        toast({
          title: "Error",
          description: "Unexpected response format from server",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to generate speech:', err);
      toast({
        title: "Error",
        description: "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    // Ensure volume is set
    audioRef.current.volume = audioVolume;
    console.log("[TTS] Audio volume set to:", audioRef.current.volume);
    console.log("[TTS] Audio muted:", audioRef.current.muted);
    console.log("[TTS] Audio duration:", audioRef.current.duration);
    console.log("[TTS] Audio ready state:", audioRef.current.readyState);

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log("[TTS] Attempting to play audio from URL:", audioUrl);
      
      // Unmute if muted
      audioRef.current.muted = false;
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("[TTS] Audio playback started successfully");
            console.log("[TTS] Current time:", audioRef.current?.currentTime);
            console.log("[TTS] Volume:", audioRef.current?.volume);
            setIsPlaying(true);
          })
          .catch(err => {
            console.error('Audio playback failed:', err);
            toast({
              title: "Playback Error",
              description: `Failed to play audio: ${err.message}. Try downloading the file instead.`,
              variant: "destructive",
            });
          });
      }
    }
  };

  const handleAudioEnded = () => {
    console.log("[TTS] Audio playback ended");
    setIsPlaying(false);
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    console.error("[TTS] Audio element error:", e.currentTarget.error);
    setIsPlaying(false);
    toast({
      title: "Audio Error",
      description: "There was an error with the audio file. Try generating again.",
      variant: "destructive",
    });
  };

  const handleAudioCanPlay = () => {
    console.log("[TTS] Audio can play - ready for playback");
    console.log("[TTS] Audio duration:", audioRef.current?.duration);
    console.log("[TTS] Audio volume:", audioRef.current?.volume);
  };

  const handleAudioLoadedData = () => {
    console.log("[TTS] Audio data loaded");
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
      console.log("[TTS] Set volume to:", audioRef.current.volume);
    }
  };

  const testSystemAudio = () => {
    // Create a simple beep to test if system audio is working
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    
    console.log("[TTS] Test beep played");
    toast({
      title: "Audio Test",
      description: "Test beep played. If you heard it, your system audio is working.",
    });
  };

  const updateSettings = (key: keyof TTSSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          ElevenLabs TTS Test
          {healthStatus && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={checkHealth}
                className="gap-2"
              >
                Health Check
                {healthStatus.ok && healthStatus.hasKey ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                )}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Text Input */}
        <div className="space-y-2">
          <Label htmlFor="text-input">Text to convert to speech</Label>
          <Textarea
            id="text-input"
            placeholder="Enter text here... (supports unicode and multi-paragraph input)"
            value={settings.text}
            onChange={(e) => updateSettings('text', e.target.value)}
            className="min-h-32 resize-y"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Character count: {settings.text.length}</span>
            <span className={remainingChars < 0 ? 'text-red-600' : ''}>
              Remaining: {remainingChars}
            </span>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <Label htmlFor="voice-select">Voice</Label>
          {isLoadingVoices ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading voices...
            </div>
          ) : voicesError ? (
            <div className="text-sm text-amber-600 mb-2">{voicesError}</div>
          ) : null}
          
          <Select
            value={settings.voiceId}
            onValueChange={(value) => updateSettings('voiceId', value)}
            disabled={isGenerating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Options */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Advanced Options
              <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Stability */}
            <div className="space-y-2">
              <Label>Stability: {settings.stability}</Label>
              <Slider
                value={[settings.stability]}
                onValueChange={([value]) => updateSettings('stability', value)}
                max={1}
                min={0}
                step={0.01}
                disabled={isGenerating}
              />
            </div>

            {/* Similarity Boost */}
            <div className="space-y-2">
              <Label>Similarity Boost: {settings.similarityBoost}</Label>
              <Slider
                value={[settings.similarityBoost]}
                onValueChange={([value]) => updateSettings('similarityBoost', value)}
                max={1}
                min={0}
                step={0.01}
                disabled={isGenerating}
              />
            </div>

            {/* Style */}
            <div className="space-y-2">
              <Label>Style: {settings.style}</Label>
              <Slider
                value={[settings.style]}
                onValueChange={([value]) => updateSettings('style', value)}
                max={1}
                min={0}
                step={0.01}
                disabled={isGenerating}
              />
            </div>

            {/* Speaker Boost */}
            <div className="flex items-center space-x-2">
              <Switch
                id="speaker-boost"
                checked={settings.useSpeakerBoost}
                onCheckedChange={(checked) => updateSettings('useSpeakerBoost', checked)}
                disabled={isGenerating}
              />
              <Label htmlFor="speaker-boost">Use Speaker Boost</Label>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Audio Volume Control */}
        <div className="space-y-2">
          <Label>Audio Volume: {Math.round(audioVolume * 100)}%</Label>
          <Slider
            value={[audioVolume]}
            onValueChange={([value]) => setAudioVolume(value)}
            max={1}
            min={0}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* System Audio Test */}
        <Button
          onClick={testSystemAudio}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Test System Audio (Beep)
        </Button>

        {/* Generate Button */}
        <Button
          onClick={generateSpeech}
          disabled={isGenerating || !settings.text.trim() || remainingChars < 0}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Speech...
            </>
          ) : (
            <>
              <Volume2 className="mr-2 h-4 w-4" />
              Generate Speech
            </>
          )}
        </Button>

        {/* Audio Player */}
        {audioUrl && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-green-800 font-medium text-center">Audio Generated!</div>
            
            {/* Audio element with comprehensive event handling */}
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              onError={handleAudioError}
              onCanPlay={handleAudioCanPlay}
              onLoadedData={handleAudioLoadedData}
              preload="metadata"
              className="hidden"
            />
            
            {/* Custom audio controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={togglePlayback}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isPlaying ? (
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
              
              <div className="flex items-center gap-2">
                {audioVolume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                <span className="text-sm">{Math.round(audioVolume * 100)}%</span>
              </div>
              
              <Button asChild variant="outline" size="sm">
                <a
                  href={audioUrl}
                  download="speech.mp3"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download MP3
                </a>
              </Button>
            </div>
            
            {/* Audio debug info */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <div>Audio URL: {audioUrl.substring(0, 50)}...</div>
              <div>Volume: {Math.round(audioVolume * 100)}%</div>
              {audioRef.current && (
                <div>Ready State: {audioRef.current.readyState} | Duration: {audioRef.current.duration || 'Unknown'}</div>
              )}
            </div>
          </div>
        )}

        {/* Health Status */}
        {healthStatus && !healthStatus.ok && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-red-800 font-medium">Service Health Issue</div>
            <div className="text-red-700 text-sm">
              {!healthStatus.hasKey 
                ? "ElevenLabs API key not configured"
                : "Service temporarily unavailable"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ElevenLabsTTSTest;
