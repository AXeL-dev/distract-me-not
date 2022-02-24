import React from 'react';
import { Pane, Switch, Position } from 'evergreen-ui';
import { TooltipLabel, OuterPane } from 'components';

export function SwitchField(props) {
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
      <Pane
        display="flex"
        alignItems="center"
        marginRight={props.position === Position.LEFT ? 12 : 0}
      >
        <Switch
          height={props.height || 18}
          checked={props.checked}
          onChange={props.onChange}
        />
      </Pane>
    </OuterPane>
  );
}
