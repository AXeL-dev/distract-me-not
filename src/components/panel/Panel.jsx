import { Component, Fragment } from 'react';
import { Pane, Text, Position, Badge, PlusIcon, TickIcon, TimeIcon, SmallMinusIcon } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { sendMessage, getActiveTab, getActiveTabHostname, storage } from '../../helpers/webext';
import { Mode, defaultBlacklist, defaultWhitelist, defaultSchedule, isAccessible } from '../../helpers/block';
import { inToday } from '../../helpers/date';
import Header from '../shared/header/Header';
import SwitchField from '../shared/switch-field/SwitchField';
import SegmentedControlField from '../shared/segmented-control-field/SegmentedControlField';
import AnimatedIconButton from '../shared/animated-icon-button/AnimatedIconButton';
import SettingsButton from '../shared/settings-button/SettingsButton';
import './Panel.scss';

export default class Panel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      status: true,
      modes: [
        { label: translate('blacklist'), value: Mode.blacklist },
        { label: translate('whitelist'), value: Mode.whitelist },
      ],
      mode: Mode.blacklist,
      schedule: defaultSchedule,
      isAddButtonVisible: true
    };
  }

  componentDidMount() {
    sendMessage('getIsEnabled').then(isEnabled => this.setState({ status: !!isEnabled })); // !! used to cast null to boolean
    sendMessage('getSchedule').then(schedule => this.setState({ schedule: schedule || defaultSchedule }));
    sendMessage('getMode').then(mode => {
      this.setState({ mode: mode });
      this.toggleAddButton(mode);
    });
  }

  toggleAddButton = (mode) => {
    getActiveTab().then(async (tab) => {
      if (tab) {
        if (!isAccessible(tab.url)) {
          this.hideAddButton();
        } else {
          switch (mode) {
            case Mode.blacklist:
              const isBlacklisted = await sendMessage('isBlacklisted', tab.url);
              if (isBlacklisted) {
                this.hideAddButton();
                return; // exit
              }
              break;
            case Mode.whitelist:
              const isWhitelisted = await sendMessage('isWhitelisted', tab.url);
              if (isWhitelisted) {
                this.hideAddButton();
                return;
              }
              break;
          }
          // finally, show add button if tab is not blacklisted nor whitelisted
          this.showAddButton();
        }
      }
    });
  }

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
    sendMessage('setIsEnabled', value); // update background script
    storage.set({ isEnabled: value });
  }

  changeMode = (value) => {
    this.setState({ mode: value });
    sendMessage('setMode', value);
    storage.set({ mode: value });
    this.toggleAddButton(value);
  }

  addCurrentHostname = () => {
    getActiveTabHostname().then(hostname => {
      if (hostname) {
        const pattern = `*.${hostname}`;
        switch (this.state.mode) {
          case Mode.blacklist:
            storage.get({
              blacklist: defaultBlacklist
            }).then(({ blacklist }) => {
              for (let index in blacklist) {
                if (blacklist[index].indexOf(pattern) >= 0) {
                  return;
                }
              }
              blacklist.splice(0, 0, pattern);
              sendMessage('setBlacklist', blacklist);
              storage.set({ blacklist: blacklist });
            });
            break;
          case Mode.whitelist:
            // ToDo: merge common code (@see above)
            storage.get({
              whitelist: defaultWhitelist
            }).then(({ whitelist }) => {
              for (let index in whitelist) {
                if (whitelist[index].indexOf(pattern) >= 0) {
                  return;
                }
              }
              whitelist.splice(0, 0, pattern);
              sendMessage('setWhitelist', whitelist);
              storage.set({ whitelist: whitelist });
            });
            break;
        }
      }
    });
  }

  render() {
    return (
      <Pane minWidth={320}>
        <Header />
        {this.state.status && this.state.schedule.isEnabled ? (
          <Pane display="flex" paddingX={16} paddingY={20}>
            <Pane display="flex" alignItems="center" flex={1}>
              <Text className="cursor-default">{translate('status')}</Text>
            </Pane>
            <Pane display="flex" alignItems="center" justifyContent="center">
              {inToday(this.state.schedule.days) ? (
                <Fragment>
                  {this.state.schedule.time.start.length ? (
                    <Fragment>
                      <TimeIcon color="#3d8bd4" marginRight={10} />
                      <Text className="cursor-default" size={300}>{this.state.schedule.time.start}</Text>
                      <SmallMinusIcon color="#666" marginX={3} />
                      {this.state.schedule.time.end.length ? (
                        <Text className="cursor-default" size={300}>{this.state.schedule.time.end}</Text>
                      ) : (
                        <Badge color="blue" isSolid={false}>{translate('dayEnd')}</Badge>
                      )}
                    </Fragment>
                  ) : (
                    <Badge color="green" isSolid={false}>{translate('enabled')}</Badge>
                  )}
                </Fragment>
              ) : (
                <Badge color="neutral" isSolid={false}>{translate('dayOff')}</Badge>
              )}
            </Pane>
          </Pane>
        ) : (
          <SwitchField
            label={translate('status')}
            labelClassName="cursor-default"
            checked={this.state.status}
            onChange={event => this.toggleStatus(event.target.checked)}
            height={24}
            paddingX={16}
            paddingY={20}
          />
        )}
        <SegmentedControlField
          name="mode"
          label={translate('mode')}
          labelClassName="cursor-default"
          options={this.state.modes}
          value={this.state.mode}
          onChange={this.changeMode}
          width={200}
          paddingX={16}
          paddingBottom={20}
        />
        <Pane display="flex" paddingX={16} paddingY={10} alignItems="center" justifyContent="space-between" borderTop>
          <Pane>
            <SettingsButton history={this.props.history} />
          </Pane>
          <Pane>
            <AnimatedIconButton
              appearance="minimal"
              tooltip={this.state.mode === 'blacklist' ? translate('addToBlacklist') : translate('addToWhitelist')}
              tooltipPosition={Position.LEFT}
              className="fill-green"
              icon={PlusIcon}
              iconSize={26}
              iconColor="#47b881"
              onClick={this.addCurrentHostname}
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
