
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
      {isPushActive && (
        <Badge variant="outline" className="text-xs">
          Push: Listening
        </Badge>
      )}
    </div>
  );
};

export default SyncStatusBadge;

