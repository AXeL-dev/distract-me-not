import { Component } from 'react';
import { Pane, Heading, Tooltip, Position, IconButton, CogIcon, PlusIcon } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { isWebExtension, openOptionsPage } from '../../helpers/webext';
import SwitchField from '../shared/switch-field/SwitchField';
import SegmentedControlField from '../shared/segmented-control-field/SegmentedControlField';
import './Panel.scss';

export default class Panel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      status: true,
      modes: [
        { label: translate('blacklist'), value: 'blacklist' },
        { label: translate('whitelist'), value: 'whitelist' },
      ],
      mode: 'blacklist'
    };
  }

  toggleStatus = (value) => {
    this.setState({ status: value });
  }

  changeMode = (value) => {
    this.setState({ mode: value });
  }

  goToSettings = () => {
    if (isWebExtension()) {
      openOptionsPage();
    } else {
      this.props.history.push('/settings');
    }
  }

  render() {
    return (
      <Pane minWidth={320}>
        <Pane display="flex" alignItems="center" justifyContent="center" height={64} borderBottom>
          <img className="logo" src="icons/magnet-256.png" />
          <Heading size={600} fontWeight="bold">{translate('appName') || 'Distract Me Not'}</Heading>
        </Pane>
        <SwitchField
          label={translate('status')}
          checked={this.state.status}
          onChange={event => this.toggleStatus(event.target.checked)}
          height={24}
          paddingX={16}
          paddingY={20}
        />
        <SegmentedControlField
          name="mode"
          label={translate('mode')}
          options={this.state.modes}
          value={this.state.mode}
          onChange={this.changeMode}
          width={200}
          paddingX={16}
          paddingBottom={20}
        />
        <Pane display="flex" paddingX={16} paddingY={12} alignItems="center" justifyContent="space-between" borderTop>
          <Pane>
            <Tooltip content={translate('settings')} position={Position.RIGHT}>
              <IconButton
                className="custom-icon-button fill-grey"
                appearance="minimal"
                icon={CogIcon}
                iconSize={22}
                onClick={this.goToSettings}
              />
            </Tooltip>
          </Pane>
          <Pane>
            <Tooltip content={this.state.mode === 'blacklist' ? translate('addToBlacklist') : translate('addToWhitelist')} position={Position.LEFT}>
              <IconButton
                className="custom-icon-button fill-green"
                appearance="minimal"
                icon={PlusIcon}
                iconSize={26}
              />
            </Tooltip>
          </Pane>
        </Pane>
      </Pane>
    );
  }

}
