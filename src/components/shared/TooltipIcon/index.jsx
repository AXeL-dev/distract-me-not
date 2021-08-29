import React from 'react';
import { Icon, Tooltip, Position } from 'evergreen-ui';

export function TooltipIcon({ tooltip, tooltipPosition, ...props}) {

  const renderIcon = (props) => {
    return (
      <Icon {...props}/>
    );
  }

  return tooltip ? (
    <Tooltip content={tooltip} position={tooltipPosition || Position.BOTTOM}>
      {renderIcon(props)}
    </Tooltip>
  ) : (
    renderIcon(props)
  );
}
