import { Component, Fragment } from 'react';
import { Pane, Text, Heading, Switch, SegmentedControl, Tooltip, Position } from 'evergreen-ui';
import { CogIcon, PlusIcon } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { isWebExtension, openOptionsPage } from '../../helpers/webext';
import './Panel.scss';

class Panel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      status: true,
      modes: [
        {
          label: translate('settings_blacklist_title') || 'Blacklist',
          value: 'blacklist'
        },
        {
          label: translate('settings_whitelist_title') || 'Whitelist',
          value: 'whitelist'
        },
      ],
      mode: 'blacklist'
    };
  }

  toggleStatus(newStatus) {
    this.setState({ status: newStatus });
  }

  changeMode(newMode) {
    this.setState({ mode: newMode });
  }

  goToSettings() {
    if (isWebExtension()) {
      openOptionsPage();
    } else {
      this.props.history.push('/settings');
    }
  }

  render() {
    return (
      <Fragment>
        <Pane display="flex" alignItems="center" justifyContent="center" height={64} borderBottom>
          <img className="logo" src="icons/magnet-256.png" />
          <Heading size={600} className="bold">{translate('appName') || 'Distract Me Not'}</Heading>
        </Pane>
        <Pane display="flex" paddingX={16} paddingY={20}>
          <Pane flex={1} alignItems="center" display="flex">
            <Text>{translate('main_status') || 'Status'}</Text>
          </Pane>
          <Pane>
            <Switch
              height={24}
              checked={this.state.status}
              onChange={event => this.toggleStatus(event.target.checked)}
            />
          </Pane>
        </Pane>
        <Pane display="flex" paddingX={16} paddingBottom={20} style={{ minWidth: 320 }}>
          <Pane flex={1} alignItems="center" display="flex">
            <Text>{translate('main_mode') || 'Mode'}</Text>
          </Pane>
          <Pane>
            <SegmentedControl
              name="mode"
              className="custom-segmented-control"
              width={200}
              options={this.state.modes}
              value={this.state.mode}
              onChange={value => this.changeMode(value)}
            />
          </Pane>
        </Pane>
        <Pane display="flex" paddingX={16} paddingY={12} alignItems="center" justifyContent="space-between" borderTop>
          <Pane>
            <Tooltip content={translate('main_settings_tooltip') || 'Settings'} position={Position.RIGHT} showDelay={200}>
              <CogIcon className="icon-button fill-grey grow" size={22} onClick={() => this.goToSettings()} />
            </Tooltip>
          </Pane>
          <Pane>
            <Tooltip content={translate('main_add_blacklist_tooltip') || 'Add website to list'} position={Position.LEFT} showDelay={200}>
              <PlusIcon className="icon-button grow" size={26} color="success" />
            </Tooltip>
          </Pane>
        </Pane>
      </Fragment>
    );
  }

}

export default Panel;
