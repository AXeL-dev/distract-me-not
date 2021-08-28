import React from 'react';
import { Pane } from 'evergreen-ui';
import { TooltipLabel, OuterPane } from 'components';

export function TimeField(props) {
  return (
    <OuterPane display="flex" {...props}>
      <Pane display="flex" alignItems="center" flex={1}>
        <TooltipLabel
          text={props.label}
          size={props.labelSize}
          color={props.labelColor}
          className={props.labelClassName}
          tooltip={props.tooltip}
          tooltipPosition={props.tooltipPosition}
        />
      </Pane>
      <Pane display="flex" alignItems="center">
        <input
          type="time"
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
        />
      </Pane>
    </OuterPane>
  );
}
