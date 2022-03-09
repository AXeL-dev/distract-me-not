import React, { Component } from 'react';
import { Position, CogIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { isWebExtension, openExtensionPage } from 'helpers/webext';
import { IconButton } from 'components';

export class SettingsButton extends Component {
  goToSettings = () => {
    if (isWebExtension) {
      openExtensionPage('/settings', {
        closeCurrent: true,
      });
    } else {
      this.props.history.push('/settings');
    }
  };

  render() {
    return (
      <IconButton
        appearance="minimal"
        tooltip={translate('settings')}
        tooltipPosition={Position.RIGHT}
        icon={CogIcon}
        iconColor="#4E4E50"
        onClick={this.goToSettings}
        disabled={this.props.disabled}
      />
    );
  }
}
