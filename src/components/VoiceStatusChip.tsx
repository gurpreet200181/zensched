import { Badge } from '@/components/ui/badge';

interface VoiceStatusChipProps {
  provider: string | null;
  className?: string;
}

const VoiceStatusChip = ({ provider, className }: VoiceStatusChipProps) => {
  if (!provider) return null;

  const getProviderDisplay = (provider: string) => {
    switch (provider) {
      case 'elevenlabs':
        return { label: 'Voice: ElevenLabs', variant: 'default' as const };
      case 'openai':
        return { label: 'Voice: OpenAI', variant: 'secondary' as const };
      case 'none':
        return { label: 'Voice: Fallback', variant: 'outline' as const };
      default:
        return { label: 'Voice: Unknown', variant: 'outline' as const };
    }
  };

  const { label, variant } = getProviderDisplay(provider);

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};

export default VoiceStatusChip;