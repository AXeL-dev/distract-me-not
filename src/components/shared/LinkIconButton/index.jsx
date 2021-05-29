import React, { Component } from 'react';
import { Position } from 'evergreen-ui';
import { isWebExtension, openExtensionPage } from 'helpers/webext';
import { IconButton } from 'components';

export class LinkIconButton extends Component {

  handleClick = () => {
    if (this.props.history && this.props.link) {
      if (isWebExtension) {
        openExtensionPage(this.props.link);
      } else {
        this.props.history.push(this.props.link);
      }
    }
  }

  render() {
    return (
      <IconButton
        appearance="minimal"
        tooltip={this.props.tooltip}
        tooltipPosition={Position.RIGHT}
        className="fill-grey"
        icon={this.props.icon}
        iconSize={22}
        iconColor="#4E4E50"
        onClick={this.handleClick}
      />
    );
  }
}
