import LabeledTextField from './labeled';
import ActionedTextField from './actioned';

export function TextField(props) {
  return props.label ? <LabeledTextField {...props} /> : <ActionedTextField {...props} />;
}
