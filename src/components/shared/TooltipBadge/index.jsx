import React from 'react';
import { Badge, Tooltip, Position } from 'evergreen-ui';

export function TooltipBadge({ tooltip, tooltipPosition, ...props}) {

  const renderBadge = (props) => {
    return (
      <Badge {...props}/>
    );
  }

  return tooltip ? (
    <Tooltip content={tooltip} position={tooltipPosition || Position.BOTTOM}>
      {renderBadge(props)}
    </Tooltip>
  ) : (
    renderBadge(props)
  );
}
