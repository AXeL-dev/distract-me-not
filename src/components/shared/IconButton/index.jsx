import React, { Component } from 'react';
import { Button, Icon } from 'evergreen-ui';
import { Tooltip } from '../';
import './styles.scss';

// Icon button component with support for custom icon color
export class IconButton extends Component {
  renderButton() {
    return (
      <Button
        display="flex"
        justifyContent="center"
        className={['icon-button', this.props.className || ''].join(' ')}
        appearance={this.props.appearance}
        disabled={this.props.disabled}
        onClick={this.props.onClick}
        padding={this.props.padding || 0}
        width={this.props.width || 32}
        height={this.props.height || 32}
        borderTopLeftRadius={
          this.props.borderTopLeftRadius >= 0 ? this.props.borderTopLeftRadius : 3
        }
        borderTopRightRadius={
          this.props.borderTopRightRadius >= 0 ? this.props.borderTopRightRadius : 3
        }
        borderBottomLeftRadius={
          this.props.borderBottomLeftRadius >= 0 ? this.props.borderBottomLeftRadius : 3
        }
        borderBottomRightRadius={
          this.props.borderBottomRightRadius >= 0 ? this.props.borderBottomRightRadius : 3
        }
      >
        <Icon
          icon={this.props.icon}
          size={this.props.iconSize || 18}
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
