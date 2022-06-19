import React, { Component } from 'react';
import { Position } from 'evergreen-ui';
import { isWebExtension, openExtensionPage } from 'helpers/webext';
import { IconButton } from 'components';

export class LinkIconButton extends Component {
  handleClick = () => {
    if (this.props.link) {
      if (this.props.external) {
        window.open(this.props.link, '_blank');
        window.close();
      } else {
        if (isWebExtension && !this.props.sameTab) {
          openExtensionPage(this.props.link, {
            closeCurrent: true,
          });
        } else if (this.props.history) {
          this.props.history.push({
            pathname: this.props.link,
            search: this.props.search || '',
            state: this.props.state,
          });
        }
      }
    }
  };

  render() {
    return (
      <IconButton
        appearance="minimal"
        tooltip={this.props.tooltip}
        tooltipPosition={Position.RIGHT}
        icon={this.props.icon}
        iconSize={this.props.iconSize}
        iconColor="#4E4E50"
        onClick={this.handleClick}
        disabled={this.props.disabled}
      />
    );
  }
}
