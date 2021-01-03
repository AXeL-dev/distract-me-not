import { Component } from 'react';
import { Pane, Heading, Position, CogIcon, PlusIcon, TickIcon } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { isWebExtension, openOptionsPage, sendMessage, getActiveTab, getActiveTabHost, storage } from '../../helpers/webext';
import SwitchField from '../shared/switch-field/SwitchField';
import SegmentedControlField from '../shared/segmented-control-field/SegmentedControlField';
import AnimatedIconButton from '../shared/animated-icon-button/AnimatedIconButton';
import './Panel.scss';

const Mode = {
  Blacklist: 'blacklist',
  Whitelist: 'whitelist'
};

export default class Panel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      status: true,
      modes: [
        { label: translate('blacklist'), value: Mode.Blacklist },
        { label: translate('whitelist'), value: Mode.Whitelist },
      ],
      mode: Mode.Blacklist,
      isAddButtonVisible: true,
      defaults: { // to refactor/remove later
        blacklist: [],
        whitelist: []
      }
    };
  }

  componentDidMount() {
    sendMessage('getIsEnabled').then(isEnabled => this.setState({ status: !!isEnabled })); // !! used to cast null to boolean
    sendMessage('getIsWhitelistMode').then(isWhitelistMode => {
      const mode = !!isWhitelistMode ? Mode.Whitelist : Mode.Blacklist;
      this.setState({ mode: mode });
      this.toggleAddButton(mode);
    });
    // For backward compatibility only, ToDo: Refactor/share default lists
    sendMessage('getDefaultBlacklist').then(blacklist => this.setState({ defaults: {...this.state.defaults, blacklist: blacklist } }));
    sendMessage('getDefaultWhitelist').then(whitelist => this.setState({ defaults: {...this.state.defaults, whitelist: whitelist } }));
  }

  toggleAddButton = (mode) => {
    getActiveTab().then(async (tab) => {
      if (tab) {
        const isAccessible = await sendMessage('isAccessible', tab);
        if (!isAccessible) {
          this.hideAddButton();
        } else {
          switch (mode) {
            case Mode.Blacklist:
              const isBlacklisted = await sendMessage('isBlacklisted', tab);
              if (isBlacklisted) {
                this.hideAddButton();
              } else {
                this.showAddButton();
              }
              break;
            case Mode.Whitelist:
              const isWhitelisted = await sendMessage('isWhitelisted', tab);
              if (isWhitelisted) {
                this.hideAddButton();
              } else {
                this.showAddButton();
              }
              break;
          }
        }
      }
    });
  };

  hideAddButton = () => {
    this.setAddButtonVisibility(false);
  }

  showAddButton = () => {
    this.setAddButtonVisibility(true);
  }

  setAddButtonVisibility = (value) => {
    this.setState({ isAddButtonVisible: value });
  }

  toggleStatus = (value) => {
    this.setState({ status: value });
    sendMessage('setIsEnabled', value);
    storage.set({ isEnabled: value });
  }

  changeMode = (value) => {
    this.setState({ mode: value });
    const isWhitelistMode = value === Mode.Whitelist; // used to keep backward compatibility with v1
    sendMessage('setIsWhitelistMode', isWhitelistMode);
    storage.set({ isWhitelistMode: isWhitelistMode }); // ToDo: rename storage key to "mode"
    this.toggleAddButton(value);
  }

  goToSettings = () => {
    if (isWebExtension()) {
      openOptionsPage();
    } else {
      this.props.history.push('/settings');
    }
  }

  addCurrentHost = () => {
    getActiveTabHost().then(host => {
      if (host) {
        switch (this.state.mode) {
          case Mode.Blacklist:
            storage.get({ blackList: this.state.defaults.blacklist }).then(({ blackList: blacklist }) => { // ToDo: rename storage key to "blacklist"
              for (let item in blacklist) {
                if (blacklist[item].indexOf(host) >= 0) {
                  return;
                }
              }
              blacklist.splice(0, 0, host);
              sendMessage('setBlacklist', blacklist);
              storage.set({ blackList: blacklist });
            });
            break;
          case Mode.Whitelist:
            // ToDo: merge common code (@see above)
            storage.get({ whiteList: this.state.defaults.whitelist }).then(({ whiteList: whitelist }) => { // ToDo: rename storage key to "whitelist"
              for (let item in whitelist) {
                if (whitelist[item].indexOf(host) >= 0) {
                  return;
                }
              }
              whitelist.splice(0, 0, host);
              sendMessage('setWhitelist', whitelist);
              storage.set({ whiteList: whitelist });
            });
            break;
        }
      }
    });
  }

  render() {
    return (
      <Pane minWidth={320}>
        <Pane display="flex" alignItems="center" justifyContent="center" height={60} borderBottom>
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
        <Pane display="flex" paddingX={16} paddingY={10} alignItems="center" justifyContent="space-between" borderTop>
          <Pane>
            <AnimatedIconButton
              tooltipContent={translate('settings')}
              tooltipPosition={Position.RIGHT}
              className="fill-grey"
              icon={CogIcon}
              iconSize={22}
              onClick={this.goToSettings}
            />
          </Pane>
          <Pane>
            <AnimatedIconButton
              tooltipContent={this.state.mode === 'blacklist' ? translate('addToBlacklist') : translate('addToWhitelist')}
              tooltipPosition={Position.LEFT}
              className="fill-green"
              icon={PlusIcon}
              iconSize={26}
              onClick={this.addCurrentHost}
              hideOnClick={true}
              hideAnimationIcon={TickIcon}
              isVisible={this.state.isAddButtonVisible}
              onVisibilityChange={this.setAddButtonVisibility}
            />
          </Pane>
        </Pane>
      </Pane>
    );
  }

}
