import React from 'react';
import { Pane, TextInput, Position } from 'evergreen-ui';
import { TooltipLabel, OuterPane } from 'components';

function TextField(props) {
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
        width={props.width}
        marginRight={props.position === Position.LEFT ? 12 : 0}
      >
        <TextInput
          width={props.width}
          value={props.value}
          placeholder={props.placeholder}
          onChange={props.onChange}
          disabled={props.disabled}
        />
      </Pane>
    </OuterPane>
  );
}

export default TextField;
