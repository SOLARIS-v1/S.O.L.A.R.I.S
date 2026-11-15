import React from 'react';
import { GlobalHeader } from './GlobalHeader';

export interface TopBarStripProps {
  onOpenEnvironment?: () => void;
  onOpenTasks?: () => void;
  onOpenHazards?: () => void;
  onOpenSimulator?: () => void;
  onOpenSettings?: () => void;
  onOpenIdentify?: () => void;
  onOpenAssistant?: () => void;
  micActive?: boolean;
}

export const TopBarStrip: React.FC<TopBarStripProps> = (props) => {
  return (
    <GlobalHeader
      onOpenSimulator={props.onOpenSimulator}
      onOpenIdentify={props.onOpenIdentify}
      onOpenAssistant={props.onOpenAssistant}
      onOpenEnvironment={props.onOpenEnvironment}
    />
  );
};

export default TopBarStrip;
