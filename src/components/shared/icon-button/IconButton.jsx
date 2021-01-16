import { Component } from 'react';
import { Tooltip, Button, Icon } from 'evergreen-ui';
import './IconButton.scss';

// Icon button component with support for custom icon color
export default class IconButton extends Component {

  constructor(props) {
    super(props);
  }

  renderButton() {
    return (
      <Button
        display="flex"
        justifyContent="center"
        className={`icon-button ${this.props.className || ''}`}
        appearance={this.props.appearance}
        onClick={this.props.onClick}
        padding={this.props.padding || 0}
        width={this.props.width || 32}
        height={this.props.height || 32}
        borderTopLeftRadius={this.props.borderTopLeftRadius >= 0 ? this.props.borderTopLeftRadius : 3}
        borderTopRightRadius={this.props.borderTopRightRadius >= 0 ? this.props.borderTopRightRadius : 3}
        borderBottomLeftRadius={this.props.borderBottomLeftRadius >= 0 ? this.props.borderBottomLeftRadius : 3}
        borderBottomRightRadius={this.props.borderBottomRightRadius >= 0 ? this.props.borderBottomRightRadius : 3}
      >
        <Icon
          icon={this.props.icon}
          size={this.props.iconSize}
          color={this.props.iconColor}
        />
      </Button>
    );
  }

  render() {
    return this.props.tooltip ? (
      <Tooltip content={this.props.tooltip} position={this.props.tooltipPosition}>
        {this.renderButton()}
      </Tooltip>
    ) : (
      this.renderButton()
    );
  }

}
