import { Pane, Text, SegmentedControl } from 'evergreen-ui';
import './SegmentedControlField.scss';

export default function SegmentedControlField(props) {
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
        <SegmentedControl
          className="custom-segmented-control"
          name={props.name}
          width={props.width}
          options={props.options}
          value={props.value}
          onChange={props.onChange}
        />
      </Pane>
    </Pane>
  );
}
