import React from 'react';
import { Pane, Group, Button } from 'evergreen-ui';
import { OuterPane, TooltipLabel, TruncatedText } from 'components';
import { isSmallDevice } from 'helpers/device';

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

  const isSmallScreen = isSmallDevice();

  return (
    <OuterPane display="flex" gap={props.gap || 10} {...props}>
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
      <Pane display="flex" alignItems="center" minWidth={0}>
        <Group maxWidth={props.maxWidth || '100%'}>
          {options.map(({ label, value }) => {
            const checked = props.value === value;

            return (
              <Button
                key={value}
                appearance={checked ? 'primary' : 'default'}
                disabled={props.disabled}
                onClick={() => props.onChange && props.onChange(value)}
                paddingLeft={isSmallScreen ? 12 : 16}
                paddingRight={isSmallScreen ? 12 : 16}
                data-checked={checked}
              >
                <TruncatedText>{label}</TruncatedText>
              </Button>
            );
          })}
        </Group>
      </Pane>
    </OuterPane>
  );
}
