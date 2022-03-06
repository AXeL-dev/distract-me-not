import React from 'react';
import { Pane, Group, Button } from 'evergreen-ui';
import { OuterPane, TooltipLabel } from 'components';

export function SegmentedControlField(props) {
  const options = props.options.map((option) => ({
    label:
      props.showTooltips && option.tooltip ? (
        <TooltipLabel
          text={option.label}
          tooltip={option.tooltip}
          size={300}
          color="inherit"
        />
      ) : (
        option.label
      ),
    value: option.value,
  }));

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
      <Pane display="flex" alignItems="center">
        <Group maxWidth={props.maxWidth}>
          {options.map(({ label, value }) => {
            const checked = props.value === value;

            return (
              <Button
                key={value}
                appearance={checked ? 'primary' : 'default'}
                disabled={props.disabled}
                onClick={() => props.onChange && props.onChange(value)}
                data-checked={checked}
              >
                {label}
              </Button>
            );
          })}
        </Group>
      </Pane>
    </OuterPane>
  );
}
