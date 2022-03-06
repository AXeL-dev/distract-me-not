import React from 'react';
import { Pane, Text } from 'evergreen-ui';
import { TooltipLabel, NumberInput, OuterPane } from 'components';

export function NumberField(props) {
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
      <Pane display="flex" alignItems="center" gap={10}>
        <NumberInput
          min={props.min}
          max={props.max}
          step={props.step}
          width={props.inputWidth}
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
          required={props.required}
        />
        {props.suffix && <Text>{props.suffix}</Text>}
      </Pane>
    </OuterPane>
  );
}
