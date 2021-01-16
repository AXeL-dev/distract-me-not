import { Text, Tooltip, Position } from 'evergreen-ui';
import './TooltipLabel.scss';

export default function TooltipLabel(props) {

  const renderLabel = (text, size, color, className) => {
    return (
      <Text size={size} color={color} className={className}>
        {text}
      </Text>
    );
  }

  return props.tooltip ? (
    <Tooltip content={props.tooltip} position={props.tooltipPosition || Position.BOTTOM}>
      {renderLabel(props.text, props.size, props.color, `cursor-help ${props.className || ''}`)}
    </Tooltip>
  ) : (
    renderLabel(props.text, props.size, props.color, props.className)
  );
}
