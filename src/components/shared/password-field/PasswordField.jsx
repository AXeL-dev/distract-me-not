import { Pane } from 'evergreen-ui';
import TooltipLabel from '../tooltip-label/TooltipLabel';
import PasswordInput from '../password-input/PasswordInput';

export default function PasswordField(props) {
  return (
    <Pane
      display="flex"
      padding={props.padding}
      paddingX={props.paddingX || props.padding}
      paddingY={props.paddingY || props.padding}
      paddingTop={props.paddingTop || props.paddingY}
      paddingBottom={props.paddingBottom || props.paddingY}
      paddingLeft={props.paddingLeft || props.paddingX}
      paddingRight={props.paddingRight || props.paddingX}
      margin={props.margin}
      marginX={props.marginX || props.margin}
      marginY={props.marginY || props.margin}
      marginTop={props.marginTop || props.marginY}
      marginBottom={props.marginBottom || props.marginY}
      marginLeft={props.marginLeft || props.marginX}
      marginRight={props.marginRight || props.marginX}
    >
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
        />
      </Pane>
    </Pane>
  );
}