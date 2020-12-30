import { Pane, Text, Switch, Position } from 'evergreen-ui';

export default function SwitchField(props) {
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
      flexDirection={props.position === Position.LEFT ? 'row-reverse' : 'inherit'}
    >
      <Pane display="flex" alignItems="center" flex={1}>
        <Text>{props.label}</Text>
      </Pane>
      <Pane display="flex" alignItems="center" marginRight={props.position === Position.LEFT ? 12 : 0}>
        <Switch
          height={props.height || 18}
          checked={props.checked}
          onChange={props.onChange}
        />
      </Pane>
    </Pane>
  );
}
