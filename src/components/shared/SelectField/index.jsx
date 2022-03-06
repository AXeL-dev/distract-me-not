import React from 'react';
import { Pane, Select, Position } from 'evergreen-ui';
import { TooltipLabel, OuterPane } from 'components';

export function SelectField(props) {
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
        <Select
          width={props.width}
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
        >
          {props.children}
        </Select>
      </Pane>
    </OuterPane>
  );
}
