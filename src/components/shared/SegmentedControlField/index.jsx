import React from 'react';
import { Pane, Text, SegmentedControl } from 'evergreen-ui';
import { OuterPane, TooltipLabel } from 'components';
import './styles.scss';

export function SegmentedControlField(props) {
  const options = props.options.map((option) => ({
    label: props.showTooltips ? <TooltipLabel
      text={option.label}
      tooltip={option.tooltip}
      size="inherit"
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
        <SegmentedControl
          className="custom-segmented-control"
          name={props.name}
          width={props.width}
          options={options}
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
        />
      </Pane>
    </OuterPane>
  );
}
