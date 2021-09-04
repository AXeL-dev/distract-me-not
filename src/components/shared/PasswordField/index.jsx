import React from 'react';
import { Pane } from 'evergreen-ui';
import { TooltipLabel, PasswordInput, OuterPane } from 'components';

export function PasswordField(props) {
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
        <PasswordInput
          value={props.value}
          placeholder={props.placeholder}
          onChange={props.onChange}
          disabled={props.disabled}
          required={props.required}
          hasRandomButton={props.hasRandomButton}
          //data-testid={props['data-testid']}
        />
      </Pane>
    </OuterPane>
  );
}
