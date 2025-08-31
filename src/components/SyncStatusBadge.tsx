
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Radio, WifiOff } from 'lucide-react';

type Props = {
  status: string;
  isPushActive?: boolean;
};

const SyncStatusBadge: React.FC<Props> = ({ status, isPushActive = false }) => {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="flex items-center gap-1">
        {status.includes('Paused') ? (
          <WifiOff className="h-3.5 w-3.5" />
        ) : (
          <Radio className="h-3.5 w-3.5 animate-pulse" />
        )}
        <span className="text-xs">{status}</span>
      </Badge>
      {isPushActive && (
        <Badge variant="outline" className="text-xs">
          Push: Listening
        </Badge>
      )}
    </div>
  );
};

export default SyncStatusBadge;

