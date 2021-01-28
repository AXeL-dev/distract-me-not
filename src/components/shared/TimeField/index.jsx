import { Pane, Text } from 'evergreen-ui';
import { OuterPane } from 'components';

export function TimeField(props) {
  return (
    <OuterPane display="flex" {...props}>
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
    </OuterPane>
  );
}
