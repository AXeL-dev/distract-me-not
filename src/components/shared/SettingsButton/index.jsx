import React, { Component } from 'react';
import { Position, CogIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { isWebExtension, openOptionsPage, openExtensionPage } from 'helpers/webext';
import { IconButton } from 'components';

export class SettingsButton extends Component {

  goToSettings = () => {
    if (isWebExtension) {
      //openOptionsPage();
      openExtensionPage('/settings');
    } else {
      this.props.history.push('/settings');
    }
  }

  render() {
    return (
      <IconButton
        appearance="minimal"
        tooltip={translate('settings')}
        tooltipPosition={Position.RIGHT}
        className="fill-grey"
        icon={CogIcon}
        iconSize={20}
        iconColor="#4E4E50"
        onClick={this.goToSettings}
      />
    );
  }
}
