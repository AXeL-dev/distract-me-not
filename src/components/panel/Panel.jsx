import { Component } from 'react';
import { Pane, Heading, Tooltip, Position, IconButton, CogIcon, PlusIcon, TickIcon } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { isWebExtension, openOptionsPage, sendMessage, getActiveTab, getActiveTabHost, storage } from '../../helpers/webext';
import SwitchField from '../shared/switch-field/SwitchField';
import SegmentedControlField from '../shared/segmented-control-field/SegmentedControlField';
import './Panel.scss';

const Mode = {
  Blacklist: 'blacklist',
  Whitelist: 'whitelist'
};

const addButtonDefaults = {
  isVisible: true,
  className: '',
  icon: PlusIcon,
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
      addButton: addButtonDefaults,
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
      getActiveTab().then(async (tab) => {
        if (tab) {
          const isAccessible = await sendMessage('isAccessible', tab);
          if (!isAccessible) {
            this.hideAddButton(false);
          } else {
            switch (mode) {
              case Mode.Blacklist:
                const isBlacklisted = await sendMessage('isBlacklisted', tab);
                if (isBlacklisted) {
                  this.hideAddButton(false);
                }
                break;
              case Mode.Whitelist:
                const isWhitelisted = await sendMessage('isWhitelisted', tab);
                if (isWhitelisted) {
                  this.hideAddButton(false);
                }
                break;
            }
          }
        }
      });
    });
    // For backward compatibility only, ToDo: Refactor/share default lists
    sendMessage('getDefaultBlacklist').then(blacklist => this.setState({ defaults: {...this.state.defaults, blacklist: blacklist } }));
    sendMessage('getDefaultWhitelist').then(whitelist => this.setState({ defaults: {...this.state.defaults, whitelist: whitelist } }));
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
  }

  goToSettings = () => {
    if (isWebExtension()) {
      openOptionsPage();
    } else {
      this.props.history.push('/settings');
    }
  }

  showAddButton = () => {
    this.setState({ addButton: addButtonDefaults });
  }

  hideAddButton = (animate = true) => {
    const hide = () => this.setState({ addButton: {...this.state.addButton, isVisible: false } });
    if (animate) {
      // hide animation
      setTimeout(() => {
        this.setState({ addButton: {...this.state.addButton, className: 'scale-0' } }); // scale to 0
        setTimeout(() => {
          this.setState({ addButton: {...this.state.addButton, className: '', icon: TickIcon } }); // change icon
          setTimeout(() => {
            this.setState({ addButton: {...this.state.addButton, className: 'scale-0' } }); // rescale to 0
            setTimeout(() => {
              hide();
            }, 200);
          }, 500);
        }, 200);
      }, 100);
    } else {
      hide();
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
              this.hideAddButton();
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
              this.hideAddButton();
            });
            break;
        }
      } else {
        this.hideAddButton(); // for test purpose
      }
    });
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
            {this.state.addButton.isVisible &&
              <Tooltip content={this.state.mode === 'blacklist' ? translate('addToBlacklist') : translate('addToWhitelist')} position={Position.LEFT}>
                <IconButton
                  className={`custom-icon-button fill-green ${this.state.addButton.className}`}
                  appearance="minimal"
                  icon={this.state.addButton.icon}
                  iconSize={26}
                  onClick={this.addCurrentHost}
                />
              </Tooltip>
            }
          </Pane>
        </Pane>
      </Pane>
    );
  }

}
