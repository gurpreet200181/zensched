import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronDown, Download, Volume2, CheckCircle } from 'lucide-react';
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

  const maxChars = 5000;
  const remainingChars = maxChars - settings.text.length;

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
        setVoicesError("Couldn't load voices; using default voice.");
        return;
      }
      
      if (Array.isArray(data)) {
        setVoices(data);
      } else {
        console.error('Invalid voices response format:', data);
        setVoicesError("Couldn't load voices; using default voice.");
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      setVoicesError("Couldn't load voices; using default voice.");
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

      const { data, error } = await supabase.functions.invoke('tts', {
        body: payload,
      });

      if (error) {
        console.error('TTS generation error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to generate speech",
          variant: "destructive",
        });
        return;
      }

      console.log("[TTS] Received data type:", data ? Object.prototype.toString.call(data) : 'null');

      if (data instanceof ArrayBuffer) {
        const audioBlob = new Blob([data], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Auto-play the audio
        const audio = new Audio(url);
        audio.play().catch(err => {
          console.error('Auto-play failed:', err);
          toast({
            title: "Audio Ready",
            description: "Speech generated successfully! Click the download link to play.",
          });
        });

        toast({
          title: "Success",
          description: "Speech generated successfully!",
        });
      } else if (typeof data === 'string' && data.startsWith('ID3')) {
        // Handle case where audio data comes as a binary string
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          bytes[i] = data.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Auto-play the audio
        const audio = new Audio(url);
        audio.play().catch(err => {
          console.error('Auto-play failed:', err);
          toast({
            title: "Audio Ready",
            description: "Speech generated successfully! Click the download link to play.",
          });
        });

        toast({
          title: "Success",
          description: "Speech generated successfully!",
        });
      } else {
        console.error('Unexpected response format:', data);
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

        {/* Download Link */}
        {audioUrl && (
          <div className="flex items-center justify-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-green-800 font-medium">Audio ready!</div>
            <Button asChild variant="outline" size="sm">
              <a
                href={audioUrl}
                download="speech.mp3"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download speech.mp3
              </a>
            </Button>
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
