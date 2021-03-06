import React from 'react';
import { Text, Tooltip, Position } from 'evergreen-ui';
import './styles.scss';

export function TooltipLabel({ tooltip, tooltipPosition, ...props}) {

  const renderLabel = ({ text, ...props}) => {
    return (
      <Text {...props}>
        {text}
      </Text>
    );
  }

  return tooltip ? (
    <Tooltip content={tooltip} position={tooltipPosition || Position.BOTTOM}>
      {renderLabel({...props, className: `cursor-help ${props.className || ''}`})}
    </Tooltip>
  ) : (
    renderLabel(props)
  );
}
