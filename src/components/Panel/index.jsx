import React, { Component, Fragment } from 'react';
import {
  Pane,
  Text,
  Position,
  Badge,
  PlusIcon,
  TickIcon,
  DisableIcon,
  SmallMinusIcon,
  SlashIcon,
  HistoryIcon,
  ShieldIcon,
  StopwatchIcon,
} from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { sendMessage, storage } from 'helpers/webext';
import {
  Mode,
  modes,
  addCurrentWebsite,
  isActiveTabBlockable,
  defaultMode,
  defaultIsEnabled,
  defaultUnblockSettings,
} from 'helpers/block';
import { ScheduleType, defaultSchedule, getTodaySchedule } from 'helpers/schedule';
import { defaultLogsSettings } from 'helpers/logger';
import { defaultTimerSettings } from 'helpers/timer';
import { isDevEnv, isTestEnv } from 'helpers/debug';
import {
  Header,
  SwitchField,
  SegmentedControlField,
  AnimatedIconButton,
  SettingsButton,
  LinkIconButton,
  TooltipIcon,
} from 'components';
import { GithubIcon } from 'icons';
import colors from 'helpers/color';
import './styles.scss';

export class Panel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ready: isTestEnv ? true : false,
      isEnabled: defaultIsEnabled,
      mode: defaultMode,
      schedule: defaultSchedule,
      isAddButtonVisible: false,
      enableUnblock: false,
      enableLogs: false,
      enableTimer: false,
      hideReportIssueButton: false,
      showAddWebsitePrompt: false,
    };
  }

  componentDidMount() {
    Promise.all([
      sendMessage('getIsEnabled').then(
        (isEnabled) => this.setState({ isEnabled: !!isEnabled }) // !! used to cast null to boolean
      ),
      sendMessage('getSchedule').then((schedule) =>
        this.setState({ schedule: schedule || defaultSchedule })
      ),
      sendMessage('getUnblockSettings').then((unblock) =>
        this.setState({
          enableUnblock: isDevEnv || (unblock || defaultUnblockSettings).isEnabled,
        })
      ),
      sendMessage('getLogsSettings').then((logs) =>
        this.setState({
          enableLogs: isDevEnv || (logs || defaultLogsSettings).isEnabled,
        })
      ),
      sendMessage('getTimerSettings').then((timer) =>
        this.setState({
          enableTimer: (timer || defaultTimerSettings).isEnabled,
        })
      ),
      sendMessage('getMode').then((mode) => {
        this.setState({ mode });
        this.toggleAddButton(mode);
      }),
      storage
        .get({
          hideReportIssueButton: this.state.hideReportIssueButton,
          showAddWebsitePrompt: this.state.showAddWebsitePrompt,
        })
        .then(({ hideReportIssueButton, showAddWebsitePrompt }) => {
          this.setState({
            hideReportIssueButton,
            showAddWebsitePrompt,
          });
        }),
    ]).finally(() => {
      this.setState({ ready: true });
    });
  }

  toggleAddButton = async (mode) => {
    const isVisible = await isActiveTabBlockable(mode);
    this.setAddButtonVisibility(isVisible);
  };

  setAddButtonVisibility = (value) => {
    this.setState({ isAddButtonVisible: value });
  };

  toggleStatus = (value) => {
    this.setState({ isEnabled: value });
    sendMessage('setIsEnabled', value); // update background script
    storage.set({ isEnabled: value });
  };

  changeMode = (value) => {
    this.setState({ mode: value });
    sendMessage('setMode', value);
    storage.set({ mode: value });
    this.toggleAddButton(value);
  };

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
        <Text className="cursor-default" size={300}>
          {start}
        </Text>
        <SmallMinusIcon color={colors.grey} marginX={3} />
        <Text className="cursor-default" size={300}>
          {end}
        </Text>
      </Fragment>
    );
  };

  renderScheduleStatus = () => {
    const ranges = getTodaySchedule(this.state.schedule);

    return ranges.length > 0 ? (
      ranges.map((range, index) => (
        <Fragment key={index}>
          {index > 0 && <SlashIcon color={colors.grey} marginX={3} />}
          {this.renderScheduleRange(range)}
        </Fragment>
      ))
    ) : (
      <Badge color="neutral" isSolid={false}>
        {translate('dayOff')}
      </Badge>
    );
  };

  render() {
    return (
      <Pane minWidth={350}>
        {!this.state.ready ? null : (
          <>
            <Header />
            <Pane
              display="flex"
              flexDirection="column"
              minHeight={115}
              paddingX={16}
              paddingY={20}
            >
              {this.state.isEnabled && this.state.schedule.isEnabled ? (
                <Pane display="flex">
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
                  onChange={(event) => this.toggleStatus(event.target.checked)}
                />
              )}
              <SegmentedControlField
                name="mode"
                label={translate('mode')}
                labelClassName="cursor-default"
                options={modes}
                value={this.state.mode}
                onChange={this.changeMode}
                //maxWidth={260}
                paddingTop={20}
                gap={20}
              />
            </Pane>
            <Pane
              display="flex"
              paddingX={16}
              paddingY={10}
              alignItems="center"
              justifyContent="space-between"
              borderTop
            >
              <Pane display="flex" gap={10}>
                <SettingsButton history={this.props.history} />
                {this.state.enableUnblock && (
                  <LinkIconButton
                    icon={ShieldIcon}
                    link="/allowed"
                    tooltip={translate('allowedHosts')}
                    history={this.props.history}
                  />
                )}
                {this.state.enableLogs && (
                  <LinkIconButton
                    icon={HistoryIcon}
                    link="/logs"
                    tooltip={translate('logs')}
                    history={this.props.history}
                  />
                )}
                {this.state.enableTimer && (
                  <LinkIconButton
                    icon={StopwatchIcon}
                    link="/timer"
                    sameTab
                    state={{ accessAllowed: true, referer: 'panel' }}
                    tooltip={translate('timer')}
                    history={this.props.history}
                  />
                )}
                {!this.state.hideReportIssueButton && (
                  <LinkIconButton
                    icon={GithubIcon}
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
                  tooltip={
                    this.state.mode === Mode.whitelist
                      ? translate('addToWhitelist')
                      : translate('addToBlacklist')
                  }
                  tooltipPosition={Position.LEFT}
                  icon={PlusIcon}
                  iconSize={22}
                  iconColor="#47b881"
                  onClick={() =>
                    addCurrentWebsite(this.state.mode, this.state.showAddWebsitePrompt)
                  }
                  hideOnClick={true}
                  hideAnimationIcon={TickIcon}
                  isVisible={this.state.isAddButtonVisible}
                  onVisibilityChange={this.setAddButtonVisibility}
                />
              </Pane>
            </Pane>
          </>
        )}
      </Pane>
    );
  }
}
