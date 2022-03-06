import React from 'react';
import { Icon, Position } from 'evergreen-ui';
import { Tooltip } from '../';

export function TooltipIcon({ tooltip, tooltipPosition, ...props }) {
  const renderIcon = (props) => {
    return <Icon {...props} />;
  };

  return tooltip ? (
    <Tooltip content={tooltip} position={tooltipPosition || Position.BOTTOM}>
      {renderIcon(props)}
    </Tooltip>
  ) : (
    renderIcon(props)
  );
}
