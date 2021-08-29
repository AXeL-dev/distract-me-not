import React, { Component, Fragment } from 'react';
import { Pane, Text, Position, Badge, PlusIcon, TickIcon, DisableIcon, SmallMinusIcon, SlashIcon, HistoryIcon, IssueNewIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { sendMessage, getActiveTab, getActiveTabHostname, storage, createWindow, indexUrl } from 'helpers/webext';
import { Mode, modes, isAccessible, blockUrl } from 'helpers/block';
import { ScheduleType, defaultSchedule, getTodaySchedule } from 'helpers/schedule';
import { defaultLogsSettings } from 'helpers/logger';
import { Header, SwitchField, SegmentedControlField, AnimatedIconButton, SettingsButton, LinkIconButton, TooltipIcon } from 'components';
import colors from 'helpers/color';
import './styles.scss';

export class Panel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isEnabled: true,
      mode: '', //defaultMode,
      schedule: defaultSchedule,
      isAddButtonVisible: true,
      enableLogs: false,
      hideReportIssueButton: false,
      showAddWebsitePrompt: false,
    };
  }

  componentDidMount() {
    sendMessage('getIsEnabled').then(isEnabled => this.setState({ isEnabled: !!isEnabled })); // !! used to cast null to boolean
    sendMessage('getSchedule').then(schedule => this.setState({ schedule: schedule || defaultSchedule }));
    sendMessage('getLogsSettings').then(logs => this.setState({ enableLogs: (logs || defaultLogsSettings).isEnabled }));
    sendMessage('getMode').then(mode => {
      this.setState({ mode: mode });
      this.toggleAddButton(mode);
    });
    storage.get({
      hideReportIssueButton: this.state.hideReportIssueButton,
      showAddWebsitePrompt: this.state.showAddWebsitePrompt,
    }).then(({ hideReportIssueButton, showAddWebsitePrompt }) => {
      this.setState({
        hideReportIssueButton,
        showAddWebsitePrompt,
      });
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
            case Mode.combined:
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
            default:
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
    this.setState({ isEnabled: value });
    sendMessage('setIsEnabled', value); // update background script
    storage.set({ isEnabled: value });
  }

  changeMode = (value) => {
    this.setState({ mode: value });
    sendMessage('setMode', value);
    storage.set({ mode: value });
    this.toggleAddButton(value);
  }

  addCurrentWebsite = async () => {
    const hostname = await getActiveTabHostname();
    if (hostname) {
      const url = `*.${hostname}`;
      if (this.state.showAddWebsitePrompt) {
        createWindow(`${indexUrl}#addWebsitePrompt?url=${url}&mode=${this.state.mode}`, 600, 140);
      } else {
        blockUrl(url, this.state.mode);
        return true;
      }
    }
    return false;
  }

  renderScheduleRange = (range) => {
    const start = range.time.start.length ? range.time.start : '00:00';
    const end = range.time.end.length ? range.time.end : '23:59';

    return (
      <Fragment>
        {range.type === ScheduleType.allowedTime ? (
          <TooltipIcon
            icon={TickIcon}
            tooltip={translate('allowedTime')}
            color={colors.green}
            size={14}
            marginRight={10}
          />
        ) : (
          <TooltipIcon
            icon={DisableIcon}
            tooltip={translate('blockingTime')}
            color={colors.red}
            size={14}
            marginRight={10}
          />
        )}
        <Text className="cursor-default" size={300}>{start}</Text>
        <SmallMinusIcon color={colors.grey} marginX={3} />
        <Text className="cursor-default" size={300}>{end}</Text>
      </Fragment>
    );
  }

  renderScheduleStatus = () => {
    const ranges = getTodaySchedule(this.state.schedule);

    return ranges.length > 0 ? ranges.map((range, index) => (
      <Fragment key={index}>
        {index > 0 && (
          <SlashIcon color={colors.grey} marginX={3} />
        )}
        {this.renderScheduleRange(range)}
      </Fragment>
    )) : (
      <Badge color="neutral" isSolid={false}>
        {translate('dayOff')}
      </Badge>
    );
  }

  render() {
    return (
      <Pane minWidth={350}>
        <Header />
        {this.state.isEnabled && this.state.schedule.isEnabled ? (
          <Pane display="flex" paddingX={16} paddingY={20}>
            <Pane display="flex" alignItems="center" flex={1}>
              <Text className="cursor-default">{translate('status')}</Text>
            </Pane>
            <Pane display="flex" alignItems="center" justifyContent="center">
              {this.renderScheduleStatus()}
            </Pane>
          </Pane>
        ) : (
          <SwitchField
            label={translate('status')}
            labelClassName="cursor-default"
            checked={this.state.isEnabled}
            onChange={event => this.toggleStatus(event.target.checked)}
            height={22}
            paddingX={16}
            paddingY={20}
          />
        )}
        <SegmentedControlField
          name="mode"
          label={translate('mode')}
          labelClassName="cursor-default"
          options={modes}
          value={this.state.mode}
          onChange={this.changeMode}
          width={260}
          paddingX={16}
          paddingBottom={20}
        />
        <Pane display="flex" paddingX={16} paddingY={10} alignItems="center" justifyContent="space-between" borderTop>
          <Pane display="flex" gap={10}>
            <SettingsButton history={this.props.history} />
            {this.state.enableLogs && (
              <LinkIconButton
                icon={HistoryIcon}
                link="/logs"
                tooltip={translate('logs')}
                history={this.props.history}
              />
            )}
            {!this.state.hideReportIssueButton && (
              <LinkIconButton
                icon={IssueNewIcon}
                link="https://github.com/AXeL-dev/distract-me-not/issues"
                external
                tooltip={translate('reportIssue')}
                history={this.props.history}
              />
            )}
          </Pane>
          <Pane>
            <AnimatedIconButton
              appearance="minimal"
              tooltip={this.state.mode === Mode.whitelist ? translate('addToWhitelist') : translate('addToBlacklist')}
              tooltipPosition={Position.LEFT}
              className="fill-green"
              icon={PlusIcon}
              iconSize={26}
              iconColor="#47b881"
              onClick={this.addCurrentWebsite}
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
