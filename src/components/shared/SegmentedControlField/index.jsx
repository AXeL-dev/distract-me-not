import React from 'react';
import { Pane, Text, Group, Button } from 'evergreen-ui';
import { OuterPane, TooltipLabel } from 'components';

export function SegmentedControlField(props) {
  const options = props.options.map((option) => ({
    label: props.showTooltips && option.tooltip ? <TooltipLabel
      text={option.label}
      tooltip={option.tooltip}
      size={300}
      color="inherit"
    /> : option.label,
    value: option.value,
  }));

  return (
    <OuterPane display="flex" {...props}>
      <Pane display="flex" alignItems="center" flex={1}>
        <Text className={props.labelClassName}>{props.label}</Text>
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
