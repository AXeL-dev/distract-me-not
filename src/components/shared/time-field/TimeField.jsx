import { Pane, Text } from 'evergreen-ui';

export default function TimeField(props) {
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
        <Text>{props.label}</Text>
      </Pane>
      <Pane display="flex" alignItems="center">
        <input
          type="time"
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
        />
      </Pane>
    </Pane>
  );
}
