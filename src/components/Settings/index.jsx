import React, { Component, Fragment } from 'react';
import { Pane, Tablist, SidebarTab, SelectField, Checkbox, TextInputField, Button, TickIcon, PlusIcon, CrossIcon, DuplicateIcon, Paragraph, toaster, HeartIcon, Dialog } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { debug, isDevEnv } from 'helpers/debug';
import { Mode, Action, modes, actions, defaultAction, defaultMode, defaultBlacklist, defaultWhitelist, defaultUnblock } from 'helpers/block';
import { ScheduleType, defaultSchedule, newScheduleTimeRange } from 'helpers/schedule';
import { sendMessage, storage } from 'helpers/webext';
import { DaysOfWeek, today } from 'helpers/date';
import { hash } from 'helpers/crypt';
import { Header, SwitchField, SegmentedControlField, TimeField, PasswordField, WebsiteList, NumberField } from 'components';
import { defaultLogsSettings } from 'helpers/logger';
import { version } from '../../../package.json';
import _ from 'lodash';
import './styles.scss';

export class Settings extends Component {

  constructor(props) {
    super(props);
    this.blacklistComponentRef = React.createRef();
    this.whitelistComponentRef = React.createRef();
    this.state = {
      selectedTabIndex: 0,
      tabs: [
        { label: translate('blocking'), id: 'blocking' },
        { label: translate('unblocking'), id: 'unblocking', disabled: defaultAction !== Action.blockTab },
        { label: translate('schedule'), id: 'schedule' },
        { label: translate('blacklist'), id: 'blacklist', disabled: defaultMode === Mode.whitelist },
        { label: translate('whitelist'), id: 'whitelist', disabled: defaultMode === Mode.blacklist },
        { label: translate('password'), id: 'password' },
        { label: translate('logs'), id: 'logs' },
        { label: translate('miscellaneous'), id: 'misc' },
        { label: translate('about'), id: 'about' },
      ],
      scheduleDays: DaysOfWeek.map((day) => ({ label: translate(day), value: day })),
      selectedScheduleDay: today(),
      shownDialog: null,
      options: {
        isEnabled: true,
        mode: '', //defaultMode,
        action: defaultAction,
        blockTab: {
          message: '',
          displayBlankPage: false,
        },
        redirectToUrl: {
          url: '',
        },
        unblock: defaultUnblock,
        schedule: defaultSchedule,
        blacklist: isDevEnv ? defaultBlacklist : [],
        whitelist: isDevEnv ? defaultWhitelist : [],
        password: {
          isEnabled: props.enablePassword || false,
          isSet: false,
          value: '',
          hash: '',
        },
        logs: defaultLogsSettings,
        misc: {
          hideReportIssueButton: false,
          showAddWebsitePrompt: false,
          enableOnBrowserStartup: false,
        },
      },
    };
  }

  componentDidMount() {
    storage
      .get({
        isEnabled: this.state.options.isEnabled,
        mode: this.state.options.mode,
        action: this.state.options.action,
        message: this.state.options.blockTab.message,
        displayBlankPage: this.state.options.blockTab.displayBlankPage,
        redirectUrl: this.state.options.redirectToUrl.url,
        enableLogs: this.state.options.logs.isEnabled,
        logsLength: this.state.options.logs.maxLength,
        hideReportIssueButton: this.state.options.misc.hideReportIssueButton,
        showAddWebsitePrompt: this.state.options.misc.showAddWebsitePrompt,
        enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
        schedule: this.state.options.schedule,
        password: this.state.options.password,
        unblock: this.state.options.unblock,
        blacklist: defaultBlacklist,
        whitelist: defaultWhitelist,
      })
      .then(async (items) => {
        if (items) {
          // Update state
          this.setOptions({
            isEnabled: items.isEnabled || (await sendMessage('getIsEnabled')),
            mode: items.mode,
            action: items.action,
            blockTab: {
              message: items.message,
              displayBlankPage: items.displayBlankPage,
            },
            redirectToUrl: {
              url: items.redirectUrl,
            },
            schedule: {
              // merge both state & storage values
              ...this.state.options.schedule,
              ...(!items.schedule.time ? items.schedule : {}), // omit old schedule settings in version <= 2.3.0
            },
            password: {
              ...this.state.options.password,
              ...items.password,
              isSet: !!(items.password.hash && items.password.hash.length),
            },
            logs: {
              ...this.state.options.logs,
              isEnabled: items.enableLogs,
              maxLength: items.logsLength,
            },
            unblock: {
              ...this.state.options.unblock,
              ...items.unblock,
            },
            blacklist: items.blacklist,
            whitelist: items.whitelist,
            misc: {
              hideReportIssueButton: items.hideReportIssueButton,
              showAddWebsitePrompt: items.showAddWebsitePrompt,
              enableOnBrowserStartup: items.enableOnBrowserStartup,
            },
          });
          // Toggle tabs
          this.toggleListTabs(items.mode);
          this.toggleTab('unblocking', items.action !== Action.blockTab);
          // Update WebsiteList components
          this.blacklistComponentRef.current.setList(items.blacklist);
          this.whitelistComponentRef.current.setList(items.whitelist);
        }
      });
  }

  changeAction = (event) => {
    const action = event.target.value;
    this.setOptions('action', action);
    this.toggleTab('unblocking', action !== Action.blockTab);
  }

  toggleTab = (id, disabled) => {
    this.setState({
      tabs: this.state.tabs.map((tab) => {
        if (tab.id === id) {
          tab.disabled = disabled;
        }
        return tab;
      }),
    });
  }

  changeMode = (value) => {
    this.setOptions('mode', value);
    this.toggleListTabs(value);
  }

  toggleListTabs = (mode) => {
    this.setState({
      tabs: this.state.tabs.map((tab) => {
        switch (tab.id) {
          case 'whitelist':
            tab.disabled = mode === Mode.blacklist;
            break;
          case 'blacklist':
            tab.disabled = mode === Mode.whitelist;
            break;
          default:
            break;
        }
        return tab;
      }),
    });
  }

  /**
   * Set option(s) in options state
   * ex: this.setOptions({ key: value })
   *     this.setOptions('key', 'value')
   *
   * @param {...any} params
   */
  setOptions = (...params) => {
    switch (params.length) {
      case 1:
      default:
        this.setState({
          options: {
            ...this.state.options,
            ...params[0],
          },
        });
        break;
      case 2:
        const options = _.set(this.state.options, params[0], params[1]);
        this.setState({ options });
        break;
    }
  }

  save = () => {
    debug.log('save:', this.state.options);
    if (
      this.state.options.password.isEnabled &&
      this.state.options.password.value.length < 8 &&
      (!this.state.options.password.isSet || this.state.options.password.value.length)
    ) {
      toaster.danger(translate('passwordIsShort'), { id: 'settings-toaster' });
      return;
    }
    storage
      .set({
        isEnabled: this.state.options.isEnabled,
        mode: this.state.options.mode,
        action: this.state.options.action,
        message: this.state.options.blockTab.message,
        displayBlankPage: this.state.options.blockTab.displayBlankPage,
        redirectUrl: this.state.options.redirectToUrl.url,
        enableLogs: this.state.options.logs.isEnabled,
        logsLength: this.state.options.logs.maxLength,
        hideReportIssueButton: this.state.options.misc.hideReportIssueButton,
        showAddWebsitePrompt: this.state.options.misc.showAddWebsitePrompt,
        enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
        schedule: this.state.options.schedule,
        blacklist: this.state.options.blacklist,
        whitelist: this.state.options.whitelist,
        unblock: this.state.options.unblock,
        password: {
          isEnabled: this.state.options.password.isEnabled,
          hash: this.state.options.password.isEnabled // if password protection is enabled
            ? this.state.options.password.value.length // + password length is > 0
              ? hash(this.state.options.password.value) // hash & save the new password
              : this.state.options.password.hash // else, use the old hash
            : '', // else if protection is disabled, set hash to empty string
        },
      })
      .then((success) => {
        if (success) {
          // Update background script
          sendMessage('setIsEnabled', this.state.options.isEnabled);
          sendMessage('setMode', this.state.options.mode);
          sendMessage('setAction', this.state.options.action);
          sendMessage('setRedirectUrl', this.state.options.redirectToUrl.url);
          sendMessage('setSchedule', this.state.options.schedule);
          sendMessage('setBlacklist', this.state.options.blacklist);
          sendMessage('setWhitelist', this.state.options.whitelist);
          sendMessage('setUnblockOnceTimeout', this.state.options.unblock.unblockOnceTimeout);
          sendMessage('setDisplayNotificationOnTimeout', this.state.options.unblock.displayNotificationOnTimeout);
          sendMessage('setAutoReblockOnTimeout', this.state.options.unblock.autoReblockOnTimeout);
          sendMessage('setLogsSettings', this.state.options.logs);
        }
        // Show success message (keep out of success condition to ensure it's executed on unit tests & dev env.)
        toaster.success(translate('settingsSaved'), { id: 'settings-toaster' });
      });
  }

  openDonationLink = () => {
    window.open('https://www.paypal.com/paypalme/axeldev', '_blank');
  }

  openDialog = (name) => {
    this.setState({ shownDialog: name });
  }

  closeDialog = () => {
    this.setState({ shownDialog: null });
  }

  applyScheduleSettings = () => {
    this.setOptions(
      'schedule.days',
      DaysOfWeek.reduce((acc, cur) => ({
        ...acc,
        [cur]: _.cloneDeep(this.state.options.schedule.days[this.state.selectedScheduleDay]),
      }), {})
    );
    this.closeDialog();
  }

  renderBlockingTab = () => (
    <Fragment>
      <SwitchField
        label={translate('status')}
        checked={this.state.options.isEnabled}
        onChange={(event) => this.setOptions('isEnabled', event.target.checked)}
        marginBottom={16}
      />
      <SegmentedControlField
        name="mode"
        label={translate('mode')}
        options={modes}
        value={this.state.options.mode}
        onChange={this.changeMode}
        width={300}
        marginBottom={this.state.options.isEnabled ? 16 : 0}
        showTooltips
      />
      {this.state.options.isEnabled && (
        <Fragment>
          <Paragraph size={300} color="muted" marginBottom={16}>
            {translate(
              this.state.options.mode === Mode.whitelist
                ? 'blockingWhitelistDescription'
                : 'blockingBlacklistDescription'
            )}
          </Paragraph>
          <SelectField
            label={translate('defaultAction')}
            value={this.state.options.action}
            onChange={this.changeAction}
            marginBottom={16}
          >
            {actions.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </SelectField>
          {this.state.options.action === Action.blockTab && (
            <Fragment>
              <TextInputField
                label={translate('blockingMessage')}
                placeholder={translate('defaultBlockingMessage')}
                value={this.state.options.blockTab.message}
                onChange={(event) => this.setOptions('blockTab.message', event.target.value)}
                disabled={this.state.options.blockTab.displayBlankPage}
                marginBottom={16}
              />
              <Checkbox
                label={translate('displayBlankPage')}
                checked={this.state.options.blockTab.displayBlankPage}
                onChange={(event) => this.setOptions('blockTab.displayBlankPage', event.target.checked)}
              />
            </Fragment>
          )}
          {this.state.options.action === Action.redirectToUrl && (
            <TextInputField
              label={translate('url')}
              placeholder={translate('redirectUrlExample')}
              value={this.state.options.redirectToUrl.url}
              onChange={(event) => this.setOptions('redirectToUrl.url', event.target.value)}
              marginBottom={16}
            />
          )}
        </Fragment>
      )}
    </Fragment>
  )

  renderUnblockingTab = () => (
    <Fragment>
      <SwitchField
        label={translate('enableUnblocking')}
        labelSize={300}
        labelColor="muted"
        tooltip={translate('unblockingDescription')}
        checked={this.state.options.unblock.isEnabled}
        onChange={(event) => this.setOptions('unblock.isEnabled', event.target.checked)}
        marginBottom={16}
      />
      <NumberField
        label={translate('unblockOnceTimeout')}
        min={5}
        max={60}
        inputWidth={60}
        value={this.state.options.unblock.unblockOnceTimeout}
        onChange={(value) => this.setOptions('unblock.unblockOnceTimeout', value)}
        suffix={translate('seconds')}
        disabled={!this.state.options.unblock.isEnabled}
      />
      <Checkbox
        label={translate('displayNotificationOnTimeout')}
        checked={this.state.options.unblock.displayNotificationOnTimeout}
        onChange={(event) =>
          this.setOptions('unblock.displayNotificationOnTimeout', event.target.checked)
        }
        disabled={!this.state.options.unblock.isEnabled}
      />
      <Checkbox
        label={translate('autoReblockOnTimeout')}
        checked={this.state.options.unblock.autoReblockOnTimeout}
        onChange={(event) => this.setOptions('unblock.autoReblockOnTimeout', event.target.checked)}
        disabled={!this.state.options.unblock.isEnabled}
      />
      <Checkbox
        label={translate('requirePasswordToUnblockWebsites')}
        checked={this.state.options.unblock.requirePassword}
        onChange={(event) => this.setOptions('unblock.requirePassword', event.target.checked)}
        disabled={!this.state.options.unblock.isEnabled || !this.state.options.password.isEnabled}
      />
    </Fragment>
  )

  renderScheduleTab = () =>  {
    const currentScheduleDayRanges = this.state.options.schedule.days[this.state.selectedScheduleDay];

    return (
      <Fragment>
        <SwitchField
          label={translate('scheduleDescription')}
          labelSize={300}
          labelColor="muted"
          checked={this.state.options.schedule.isEnabled}
          onChange={(event) => this.setOptions('schedule.isEnabled', event.target.checked)}
          marginBottom={16}
        />
        <Pane display="flex">
          <Pane width={180}>
            <Tablist flexBasis={240} marginRight={16}>
              {this.state.scheduleDays.map((day, index) => (
                <SidebarTab
                  key={day.value}
                  id={day.value}
                  onSelect={() => this.setState({ selectedScheduleDay: day.value })}
                  isSelected={day.value === this.state.selectedScheduleDay}
                  aria-controls={`schedule-panel-${day.value}`}
                  fontSize={14}
                  disabled={!this.state.options.schedule.isEnabled}
                >
                  {day.label}
                </SidebarTab>
              ))}
            </Tablist>
          </Pane>
          <Pane flex="1">
            {this.state.scheduleDays.map((day) => 
              this.state.options.schedule.days[day.value].length === 0 ? null : (
              <Pane
                key={day.value}
                id={`schedule-panel-${day.value}`}
                role="tabpanel"
                aria-labelledby={day.label}
                aria-hidden={day.value !== this.state.selectedScheduleDay}
                display={day.value === this.state.selectedScheduleDay ? 'block' : 'none'}
                padding={16}
                border="muted"
              >
                {this.state.options.schedule.days[day.value].map((range, index) => (
                  <Fragment key={`schedule-range-${day.value}-${index}`}>
                    {index > 0 && (
                      <Pane marginTop={16} height={16} borderTop></Pane>
                    )}
                    <TimeField
                      label={translate('scheduleStartTime')}
                      value={range.time.start}
                      onChange={(event) => this.setOptions(`schedule.days['${day.value}'][${index}].time.start`, event.target.value)}
                      disabled={!this.state.options.schedule.isEnabled}
                      marginBottom={16}
                      borderTop
                    />
                    <TimeField
                      label={translate('scheduleEndTime')}
                      value={range.time.end}
                      onChange={(event) => this.setOptions(`schedule.days['${day.value}'][${index}].time.end`, event.target.value)}
                      disabled={!this.state.options.schedule.isEnabled}
                      marginBottom={16}
                    />
                    <SegmentedControlField
                      label={translate('scheduleType')}
                      options={[{
                        label: translate('blockingTime'),
                        value: ScheduleType.blockingTime,
                        tooltip: translate('scheduleTip'),
                      }, {
                        label: translate('allowedTime'),
                        value: ScheduleType.allowedTime,
                      }]}
                      value={range.type}
                      onChange={(value) => this.setOptions(`schedule.days['${day.value}'][${index}].type`, value)}
                      disabled={!this.state.options.schedule.isEnabled}
                      width={240}
                      height={28}
                      showTooltips
                    />
                  </Fragment>
                ))}
              </Pane>
            ))}
            <Pane display="flex" alignItems="center" justifyContent="center" marginTop={16}>
              {currentScheduleDayRanges.length < 2 && (
                <Button
                  height={32}
                  className="overflow-ellipsis"
                  iconBefore={PlusIcon}
                  marginRight={16}
                  onClick={() => this.setOptions(
                    `schedule.days['${this.state.selectedScheduleDay}']`,
                    [...currentScheduleDayRanges, newScheduleTimeRange()]
                  )}
                  disabled={!this.state.options.schedule.isEnabled}
                >
                  {translate('addScheduleRange')}
                </Button>
              )}
              {currentScheduleDayRanges.length > 0 && (
                <Fragment>
                  <Button
                    height={32}
                    className="overflow-ellipsis"
                    iconBefore={CrossIcon}
                    marginRight={16}
                    onClick={() => this.setOptions(
                      `schedule.days['${this.state.selectedScheduleDay}']`,
                      currentScheduleDayRanges.slice(0, -1)
                    )}
                    disabled={!this.state.options.schedule.isEnabled}
                  >
                    {translate('deleteLastScheduleRange')}
                  </Button>
                  <Button
                    height={32}
                    className="overflow-ellipsis"
                    iconBefore={DuplicateIcon}
                    onClick={() => this.openDialog('applyScheduleSettings')}
                    disabled={!this.state.options.schedule.isEnabled}
                  >
                    {translate('applyScheduleSettings')}
                  </Button>
                </Fragment>
              )}
            </Pane>
          </Pane>
        </Pane>
      </Fragment>
    );
  }

  renderBlacklistTab = () => (
    <Fragment>
      <Paragraph size={300} color="muted" marginBottom={16}>
        {translate('blacklistDescription')}
      </Paragraph>
      <WebsiteList
        ref={this.blacklistComponentRef}
        list={this.state.options.blacklist}
        onChange={(list) => this.setOptions('blacklist', list)}
        exportFilename="blacklist.txt"
        addNewItemsOnTop={true}
      />
    </Fragment>
  )

  renderWhitelistTab = () => (
    <Fragment>
      <Paragraph size={300} color="muted" marginBottom={16}>
        {translate('whitelistDescription')}
      </Paragraph>
      <WebsiteList
        ref={this.whitelistComponentRef}
        list={this.state.options.whitelist}
        onChange={(list) => this.setOptions('whitelist', list)}
        exportFilename="whitelist.txt"
        addNewItemsOnTop={true}
      />
    </Fragment>
  )

  renderPasswordTab = () => (
    <Fragment>
      <SwitchField
        label={translate('enablePasswordProtection')}
        labelSize={300}
        labelColor="muted"
        tooltip={translate('passwordDescription')}
        checked={this.state.options.password.isEnabled}
        onChange={(event) => this.setOptions('password.isEnabled', event.target.checked)}
        marginBottom={16}
      />
      <PasswordField
        label={`${translate(this.state.options.password.isSet ? 'changePassword' : 'password')}`}
        tooltip={this.state.options.password.isSet ? translate('changePasswordTooltip') : null}
        onChange={(event) => this.setOptions('password.value', event.target.value)}
        disabled={!this.state.options.password.isEnabled}
        //data-testid="password"
      />
    </Fragment>
  )

  renderLogsTab = () => (
    <Fragment>
      <SwitchField
        label={translate('enableLogs')}
        labelSize={300}
        labelColor="muted"
        checked={this.state.options.logs.isEnabled}
        onChange={(event) => this.setOptions('logs.isEnabled', event.target.checked)}
        marginBottom={16}
      />
      <NumberField
        label={translate('logsLength')}
        tooltip={translate('logsLengthDescription')}
        min={1}
        max={10000}
        inputWidth={80}
        value={this.state.options.logs.maxLength}
        onChange={(value) => this.setOptions('logs.maxLength', value)}
        marginBottom={16}
        disabled={!this.state.options.logs.isEnabled}
      />
    </Fragment>
  )

  renderMiscTab = () => (
    <Fragment>
      <SwitchField
        label={translate('hideReportIssueButton')}
        checked={this.state.options.misc.hideReportIssueButton}
        onChange={(event) => this.setOptions('misc.hideReportIssueButton', event.target.checked)}
        marginBottom={16}
      />
      <SwitchField
        label={translate('showAddWebsitePrompt')}
        tooltip={translate('showAddWebsitePromptTooltip')}
        checked={this.state.options.misc.showAddWebsitePrompt}
        onChange={(event) => this.setOptions('misc.showAddWebsitePrompt', event.target.checked)}
        marginBottom={16}
      />
      <SwitchField
        label={translate('enableOnBrowserStartup')}
        checked={this.state.options.misc.enableOnBrowserStartup}
        onChange={(event) => this.setOptions('misc.enableOnBrowserStartup', event.target.checked)}
      />
    </Fragment>
  )

  renderAboutTab = () => (
    <div className="about">
      <h3 className="title">{translate('appName')}</h3>
      <div className="block">
        <div className="text">{translate('appDesc')}</div>
        <a className="link" href="https://github.com/AXeL-dev/distract-me-not/releases" target="_blank">{`${translate('version')} ${version}`}</a>
        <a className="link" href="https://github.com/AXeL-dev/distract-me-not/blob/master/LICENSE" target="_blank">{translate('license')}</a>
        <a className="link" href="https://github.com/AXeL-dev/distract-me-not" target="_blank">Github</a>
      </div>
      <div className="small-text">{translate('supportDeveloper')}</div>
    </div>
  )

  render() {
    return (
      <Pane display="flex" padding={16} minWidth={960} width={1080}>
        <Pane width={250}>
          <Header
            height={50}
            justifyContent="start"
            marginBottom={10}
            noBorderBottom
          />
          <Tablist flexBasis={240} marginRight={16}>
            {this.state.tabs.map((tab, index) => (
              <SidebarTab
                key={tab.id}
                id={tab.id}
                onSelect={() => this.setState({ selectedTabIndex: index })}
                isSelected={index === this.state.selectedTabIndex}
                aria-controls={`panel-${tab.id}`}
                fontSize={14}
                disabled={tab.disabled}
              >
                {tab.label}
              </SidebarTab>
            ))}
          </Tablist>
        </Pane>
        <Pane flex="1">
          <Pane padding={16} border="muted">
            {this.state.tabs.map((tab, index) => (
              <Pane
                key={tab.id}
                id={`panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={tab.label}
                aria-hidden={index !== this.state.selectedTabIndex}
                display={index === this.state.selectedTabIndex ? 'block' : 'none'}
                //maxWidth={500}
              >
                {tab.id === 'blocking' && this.renderBlockingTab()}
                {tab.id === 'unblocking' && this.renderUnblockingTab()}
                {tab.id === 'schedule' && this.renderScheduleTab()}
                {tab.id === 'blacklist' && this.renderBlacklistTab()}
                {tab.id === 'whitelist' && this.renderWhitelistTab()}
                {tab.id === 'password' && this.renderPasswordTab()}
                {tab.id === 'logs' && this.renderLogsTab()}
                {tab.id === 'misc' && this.renderMiscTab()}
                {tab.id === 'about' && this.renderAboutTab()}
              </Pane>
            ))}
          </Pane>
          <Pane display="flex" alignItems="center" justifyContent="center" marginTop={16}>
            {this.state.selectedTabIndex === this.state.tabs.findIndex((tab) => tab.id === 'about') ? (
              <Button
                height={32}
                appearance="primary"
                iconBefore={HeartIcon}
                onClick={this.openDonationLink}
              >
                {translate('donate')}
              </Button>
            ) : (
              <Button
                height={32}
                appearance="primary"
                iconBefore={TickIcon}
                onClick={this.save}
              >
                {translate('save')}
              </Button>
            )}
          </Pane>
        </Pane>
        <Dialog
          isShown={this.state.shownDialog === 'applyScheduleSettings'}
          onCloseComplete={this.closeDialog}
          cancelLabel={translate('cancel')}
          confirmLabel={translate('confirm')}
          onConfirm={this.applyScheduleSettings}
          hasHeader={false}
          topOffset="24vmin"
          shouldCloseOnOverlayClick={false}
        >
          {translate('confirmApplyScheduleSettings')}
        </Dialog>
      </Pane>
    );
  }
}
