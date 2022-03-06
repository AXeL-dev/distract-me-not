import React from 'react';
import { Pane, Text } from 'evergreen-ui';
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
          disabled={props.changeLabelColorOnDisable && props.disabled}
        />
      </Pane>
      <Pane display="flex" alignItems="center" gap={10}>
        <input
          type="time"
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
        />
        {props.suffix && <Text>{props.suffix}</Text>}
      </Pane>
    </OuterPane>
  );
}
