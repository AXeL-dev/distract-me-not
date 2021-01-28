import { Pane, Text, SegmentedControl } from 'evergreen-ui';
import { OuterPane } from 'components';
import './styles.scss';

export function SegmentedControlField(props) {
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
          options={props.options}
          value={props.value}
          onChange={props.onChange}
        />
      </Pane>
    </OuterPane>
  );
}
