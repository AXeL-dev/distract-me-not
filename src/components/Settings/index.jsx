import React, { Component, Fragment } from 'react';
import {
  Pane,
  Tablist,
  Tab,
  Checkbox,
  TickIcon,
  PlusIcon,
  CrossIcon,
  DuplicateIcon,
  Paragraph,
  toaster,
  HeartIcon,
  Dialog,
  HistoryIcon,
  Pill,
  TimeIcon,
  Badge,
  WarningSignIcon,
  ImportIcon,
  ExportIcon,
} from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { debug, isDevEnv } from 'helpers/debug';
import {
  Mode,
  Action,
  modes,
  actions,
  defaultAction,
  defaultMode,
  defaultBlacklist,
  defaultWhitelist,
  defaultBlockSettings,
  defaultUnblockSettings,
  defaultIsEnabled,
  defaultPasswordSettings,
  defaultFramesType,
  framesTypes,
} from 'helpers/block';
import { ScheduleType, defaultSchedule, newScheduleTimeRange } from 'helpers/schedule';
import { sendMessage, storage, isWebExtension, openExtensionPage } from 'helpers/webext';
import { DaysOfWeek, today } from 'helpers/date';
import { hash } from 'helpers/crypt';
import {
  Header,
  SwitchField,
  SegmentedControlField,
  TimeField,
  PasswordField,
  WebsiteList,
  NumberField,
  SelectField,
  TextField,
  WordList,
  Tooltip,
  TruncatedText,
  Button,
} from 'components';
import { defaultLogsSettings } from 'helpers/logger';
import { defaultTimerSettings } from 'helpers/timer';
import { download, readFile } from 'helpers/file';
import { isSmallDevice } from 'helpers/device';
import { version } from '../../../package.json';
import { set, cloneDeep, debounce } from 'lodash';
import { format } from 'date-fns';
import './styles.scss';

export class Settings extends Component {
  constructor(props) {
    super(props);
    this.importFileInputRef = React.createRef();
    this.blacklistComponentRef = React.createRef();
    this.whitelistComponentRef = React.createRef();
    this.blacklistKeywordsComponentRef = React.createRef();
    this.whitelistKeywordsComponentRef = React.createRef();
    // prettier-ignore
    const tabs = [
      { label: translate('blocking'), id: 'blocking' },
      { label: translate('unblocking'), id: 'unblocking', disabled: defaultAction !== Action.blockTab },
      { label: translate('schedule'), id: 'schedule' },
      { label: translate('blacklist'), id: 'blacklist', disabled: defaultMode === Mode.whitelist },
      { label: translate('whitelist'), id: 'whitelist', disabled: defaultMode === Mode.blacklist },
      { label: translate('password'), id: 'password' },
      { label: translate('timer'), id: 'timer' },
      { label: translate('logs'), id: 'logs' },
      { label: translate('miscellaneous'), id: 'misc' },
      { label: translate('about'), id: 'about' },
    ];
    // prettier-ignore
    const blacklistTabs = [
      { label: translate('urls'), id: 'urls', getCount: () => this.state.options.blacklist.length },
      { label: translate('keywords'), id: 'keywords', getCount: () => this.state.options.blacklistKeywords.length },
    ];
    // prettier-ignore
    const whitelistTabs = [
      { label: translate('urls'), id: 'urls', getCount: () => this.state.options.whitelist.length },
      { label: translate('keywords'), id: 'keywords', getCount: () => this.state.options.whitelistKeywords.length },
    ];
    this.state = {
      tabs,
      selectedTab: this.getSelectedTab() || tabs[0].id,
      scheduleDays: DaysOfWeek.map((day) => ({
        label: translate(day),
        value: day,
      })),
      selectedScheduleDay: today(),
      blacklistTabs,
      selectedBlacklistTab: blacklistTabs[0].id,
      whitelistTabs,
      selectedWhitelistTab: whitelistTabs[0].id,
      shownDialog: null,
      options: {
        isEnabled: defaultIsEnabled,
        mode: '', // don't use defaultMode to avoid annoying flickering when the mode is different from the default value
        action: defaultAction,
        framesType: defaultFramesType,
        blockTab: defaultBlockSettings,
        redirectToUrl: {
          url: '',
        },
        unblock: defaultUnblockSettings,
        schedule: defaultSchedule,
        blacklist: isDevEnv ? defaultBlacklist : [],
        whitelist: isDevEnv ? defaultWhitelist : [],
        blacklistKeywords: [],
        whitelistKeywords: [],
        blacklistLastModifiedDate: null,
        whitelistLastModifiedDate: null,
        blacklistKeywordsLastModifiedDate: null,
        whitelistKeywordsLastModifiedDate: null,
        password: {
          ...defaultPasswordSettings,
          isEnabled: props.enablePassword || defaultPasswordSettings.isEnabled,
        },
        timer: defaultTimerSettings,
        logs: defaultLogsSettings,
        misc: {
          hideReportIssueButton: false,
          showAddWebsitePrompt: false,
          enableOnBrowserStartup: false,
        },
      },
      isSmallScreen: isSmallDevice(),
    };
  }

  componentDidMount() {
    this.getAllSettings().then(this.setSettings);
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = debounce(() => {
    this.setState({ isSmallScreen: isSmallDevice() });
  }, 200);

  getAllSettings = () => {
    return storage.get({
      isEnabled: this.state.options.isEnabled,
      mode: this.state.options.mode || defaultMode,
      action: this.state.options.action,
      framesType: this.state.options.framesType,
      message: this.state.options.blockTab.message,
      displayBlankPage: this.state.options.blockTab.displayBlankPage,
      displayBlockedLink: this.state.options.blockTab.displayBlockedLink,
      redirectUrl: this.state.options.redirectToUrl.url,
      enableLogs: this.state.options.logs.isEnabled,
      logsLength: this.state.options.logs.maxLength,
      hideReportIssueButton: this.state.options.misc.hideReportIssueButton,
      showAddWebsitePrompt: this.state.options.misc.showAddWebsitePrompt,
      enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
      schedule: this.state.options.schedule,
      password: this.state.options.password,
      unblock: this.state.options.unblock,
      timer: this.state.options.timer,
      blacklist: isDevEnv ? defaultBlacklist : [],
      whitelist: isDevEnv ? defaultWhitelist : [],
      blacklistKeywords: [],
      whitelistKeywords: [],
      blacklistLastModifiedDate: this.state.options.blacklistLastModifiedDate,
      whitelistLastModifiedDate: this.state.options.whitelistLastModifiedDate,
      blacklistKeywordsLastModifiedDate:
        this.state.options.blacklistKeywordsLastModifiedDate,
      whitelistKeywordsLastModifiedDate:
        this.state.options.whitelistKeywordsLastModifiedDate,
    });
  };

  setSettings = (items) => {
    if (items) {
      // Update state
      this.setOptions({
        isEnabled: items.isEnabled,
        mode: items.mode,
        action: items.action,
        framesType: items.framesType,
        blockTab: {
          message: items.message,
          displayBlankPage: items.displayBlankPage,
          displayBlockedLink: items.displayBlockedLink,
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
        timer: {
          ...this.state.options.timer,
          ...items.timer,
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
        blacklistKeywords: items.blacklistKeywords,
        whitelistKeywords: items.whitelistKeywords,
        blacklistLastModifiedDate: items.blacklistLastModifiedDate,
        whitelistLastModifiedDate: items.whitelistLastModifiedDate,
        blacklistKeywordsLastModifiedDate: items.blacklistKeywordsLastModifiedDate,
        whitelistKeywordsLastModifiedDate: items.whitelistKeywordsLastModifiedDate,
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
      this.blacklistKeywordsComponentRef.current.setList(items.blacklistKeywords);
      this.whitelistKeywordsComponentRef.current.setList(items.whitelistKeywords);
    }
  };

  changeAction = (event) => {
    const action = event.target.value;
    this.setOptions('action', action);
    this.toggleTab('unblocking', action !== Action.blockTab);
  };

  toggleTab = (id, disabled) => {
    this.setState({
      tabs: this.state.tabs.map((tab) => {
        if (tab.id === id) {
          tab.disabled = disabled;
        }
        return tab;
      }),
    });
  };

  changeMode = (value) => {
    this.setOptions('mode', value);
    this.toggleListTabs(value);
  };

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
  };

  getSelectedTab = () => {
    if (!this.props.location) {
      return undefined;
    }
    const urlParams = new URLSearchParams(this.props.location.search);
    return urlParams.get('tab');
  };

  selectTab = (id) => {
    this.setState({ selectedTab: id });
    const url = `#${this.props.location.pathname}?tab=${id}`;
    window.history.pushState({ path: url }, document.title, url);
  };

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
        const options = set(this.state.options, params[0], params[1]);
        this.setState({ options });
        break;
    }
  };

  save = () => {
    debug.log('save:', this.state.options);
    if (
      this.state.options.password.isEnabled &&
      this.state.options.password.value.length < 8 &&
      (!this.state.options.password.isSet || this.state.options.password.value.length)
    ) {
      toaster.danger(translate('passwordIsShort'), {
        id: 'settings-toaster',
      });
      return;
    }
    storage
      .set({
        isEnabled: this.state.options.isEnabled,
        mode: this.state.options.mode,
        action: this.state.options.action,
        framesType: this.state.options.framesType,
        message: this.state.options.blockTab.message,
        displayBlankPage: this.state.options.blockTab.displayBlankPage,
        displayBlockedLink: this.state.options.blockTab.displayBlockedLink,
        redirectUrl: this.state.options.redirectToUrl.url,
        enableLogs: this.state.options.logs.isEnabled,
        logsLength: this.state.options.logs.maxLength,
        hideReportIssueButton: this.state.options.misc.hideReportIssueButton,
        showAddWebsitePrompt: this.state.options.misc.showAddWebsitePrompt,
        enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
        schedule: this.state.options.schedule,
        blacklist: this.state.options.blacklist,
        whitelist: this.state.options.whitelist,
        blacklistKeywords: this.state.options.blacklistKeywords,
        whitelistKeywords: this.state.options.whitelistKeywords,
        blacklistLastModifiedDate: this.state.options.blacklistLastModifiedDate,
        whitelistLastModifiedDate: this.state.options.whitelistLastModifiedDate,
        blacklistKeywordsLastModifiedDate:
          this.state.options.blacklistKeywordsLastModifiedDate,
        whitelistKeywordsLastModifiedDate:
          this.state.options.whitelistKeywordsLastModifiedDate,
        timer: this.state.options.timer,
        unblock: this.state.options.unblock,
        password: {
          isEnabled: this.state.options.password.isEnabled,
          allowActivationWithoutPassword:
            this.state.options.password.allowActivationWithoutPassword,
          allowAddingWebsitesWithoutPassword:
            this.state.options.password.allowAddingWebsitesWithoutPassword,
          blockAccessToExtensionsPage:
            this.state.options.password.blockAccessToExtensionsPage,
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
          sendMessage('setFramesType', this.state.options.framesType);
          sendMessage('setRedirectUrl', this.state.options.redirectToUrl.url);
          sendMessage('setSchedule', this.state.options.schedule);
          sendMessage('setBlacklist', this.state.options.blacklist);
          sendMessage('setWhitelist', this.state.options.whitelist);
          sendMessage('setBlacklistKeywords', this.state.options.blacklistKeywords);
          sendMessage('setWhitelistKeywords', this.state.options.whitelistKeywords);
          sendMessage('setIsPasswordEnabled', this.state.options.password.isEnabled);
          sendMessage(
            'setBlockAccessToExtensionsPage',
            this.state.options.password.blockAccessToExtensionsPage
          );
          sendMessage('setUnblockSettings', this.state.options.unblock);
          sendMessage('setLogsSettings', this.state.options.logs);
          sendMessage('setTimerSettings', this.state.options.timer);
        }
        // Show success message (keep out of success condition to ensure it's executed on unit tests & dev env.)
        toaster.success(translate('settingsSaved'), {
          id: 'settings-toaster',
        });
      });
  };

  export = () => {
    this.getAllSettings().then((settings) => {
      if (settings) {
        const blob = new Blob([JSON.stringify(settings, null, 2)], {
          type: 'application/json',
        });
        download(blob, 'settings.json');
      }
    });
  };

  import = (file) => {
    readFile(file).then((content) => {
      try {
        const settings = JSON.parse(content);
        this.setSettings(settings);
      } catch (e) {
        // proceed
      }
    });
  };

  openDonationLink = () => {
    window.open('https://www.paypal.com/paypalme/axeldev', '_blank');
  };

  openPage = (page) => {
    if (isWebExtension) {
      openExtensionPage(page);
    } else {
      window.open(`#${page}`, '_blank');
    }
  };

  openDialog = (name) => {
    this.setState({ shownDialog: name });
  };

  closeDialog = () => {
    this.setState({ shownDialog: null });
  };

  applyScheduleSettings = () => {
    this.setOptions(
      'schedule.days',
      DaysOfWeek.reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: cloneDeep(
            this.state.options.schedule.days[this.state.selectedScheduleDay]
          ),
        }),
        {}
      )
    );
    this.closeDialog();
  };

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
        marginBottom={16}
        showTooltips
      />
      <SelectField
        label={translate('framesType')}
        tooltip={translate('framesTypeDescription')}
        value={this.state.options.framesType.join(',')}
        onChange={(event) => this.setOptions('framesType', event.target.value.split(','))}
        disabled={!this.state.options.isEnabled}
        marginBottom={16}
      >
        {framesTypes.map((frameType) => (
          <option key={frameType.value} value={frameType.value}>
            {frameType.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={translate('action')}
        tooltip={translate(
          this.state.options.mode === Mode.whitelist
            ? 'blockingWhitelistDescription'
            : 'blockingBlacklistDescription'
        )}
        value={this.state.options.action}
        onChange={this.changeAction}
        disabled={!this.state.options.isEnabled}
        marginBottom={
          [Action.blockTab, Action.redirectToUrl].includes(this.state.options.action)
            ? 16
            : 0
        }
      >
        {actions.map((action) => (
          <option key={action.value} value={action.value}>
            {action.label}
          </option>
        ))}
      </SelectField>
      {this.state.options.action === Action.blockTab && (
        <Fragment>
          <TextField
            label={translate('blockingMessage')}
            placeholder={translate('defaultBlockingMessage')}
            value={this.state.options.blockTab.message}
            onChange={(event) => this.setOptions('blockTab.message', event.target.value)}
            disabled={
              !this.state.options.isEnabled ||
              this.state.options.blockTab.displayBlankPage
            }
            width={this.state.isSmallScreen ? '100%' : 500}
            marginBottom={16}
            gap={20}
          />
          <Checkbox
            label={translate('displayBlankPage')}
            checked={this.state.options.blockTab.displayBlankPage}
            onChange={(event) =>
              this.setOptions('blockTab.displayBlankPage', event.target.checked)
            }
            disabled={!this.state.options.isEnabled}
          />
          <Checkbox
            label={translate('displayBlockedLink')}
            checked={this.state.options.blockTab.displayBlockedLink}
            onChange={(event) =>
              this.setOptions('blockTab.displayBlockedLink', event.target.checked)
            }
            disabled={
              !this.state.options.isEnabled ||
              this.state.options.blockTab.displayBlankPage
            }
            margin={0}
          />
        </Fragment>
      )}
      {this.state.options.action === Action.redirectToUrl && (
        <TextField
          label={translate('url')}
          placeholder={translate('redirectUrlExample')}
          value={this.state.options.redirectToUrl.url}
          onChange={(event) => this.setOptions('redirectToUrl.url', event.target.value)}
          disabled={!this.state.options.isEnabled}
          width={500}
        />
      )}
    </Fragment>
  );

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
        onChange={(event) =>
          this.setOptions('unblock.autoReblockOnTimeout', event.target.checked)
        }
        disabled={!this.state.options.unblock.isEnabled}
        margin={0}
      />
    </Fragment>
  );

  renderScheduleTab = () => {
    const currentScheduleDayRanges =
      this.state.options.schedule.days[this.state.selectedScheduleDay];

    return (
      <Fragment>
        <SwitchField
          label={translate('scheduleDescription')}
          labelSize={300}
          labelColor="muted"
          checked={this.state.options.schedule.isEnabled}
          onChange={(event) =>
            this.setOptions('schedule.isEnabled', event.target.checked)
          }
          marginBottom={16}
        />
        <Pane display="flex" flexDirection={this.state.isSmallScreen ? 'column' : 'row'}>
          <Pane width={this.state.isSmallScreen ? '100%' : 180}>
            <Tablist
              display="flex"
              flexDirection={this.state.isSmallScreen ? 'row' : 'column'}
              flexBasis={this.state.isSmallScreen ? 'auto' : 240}
              marginRight={this.state.isSmallScreen ? 0 : 16}
              marginBottom={this.state.isSmallScreen ? 16 : 0}
              overflow={this.state.isSmallScreen ? 'auto' : 'initial'}
              padding={this.state.isSmallScreen ? 2 : 0}
              gap={this.state.isSmallScreen ? 5 : 0}
            >
              {this.state.scheduleDays.map((day) => (
                <Tab
                  direction="vertical"
                  whiteSpace="nowrap"
                  key={day.value}
                  id={day.value}
                  onSelect={() => this.setState({ selectedScheduleDay: day.value })}
                  isSelected={day.value === this.state.selectedScheduleDay}
                  aria-controls={`schedule-panel-${day.value}`}
                  fontSize={14}
                  height={30}
                  marginBottom={this.state.isSmallScreen ? 0 : 6}
                  disabled={!this.state.options.schedule.isEnabled}
                >
                  {day.label}
                </Tab>
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
                  display={
                    day.value === this.state.selectedScheduleDay ? 'block' : 'none'
                  }
                  padding={16}
                  border="muted"
                >
                  {this.state.options.schedule.days[day.value].map((range, index) => (
                    <Fragment key={`schedule-range-${day.value}-${index}`}>
                      {index > 0 && <Pane marginTop={16} height={16} borderTop></Pane>}
                      <TimeField
                        label={translate('scheduleStartTime')}
                        value={range.time.start}
                        onChange={(event) =>
                          this.setOptions(
                            `schedule.days['${day.value}'][${index}].time.start`,
                            event.target.value
                          )
                        }
                        disabled={!this.state.options.schedule.isEnabled}
                        changeLabelColorOnDisable
                        marginBottom={16}
                      />
                      <TimeField
                        label={translate('scheduleEndTime')}
                        value={range.time.end}
                        onChange={(event) =>
                          this.setOptions(
                            `schedule.days['${day.value}'][${index}].time.end`,
                            event.target.value
                          )
                        }
                        disabled={!this.state.options.schedule.isEnabled}
                        changeLabelColorOnDisable
                        marginBottom={16}
                      />
                      <SegmentedControlField
                        label={translate('scheduleType')}
                        options={[
                          {
                            label: translate('blockingTime'),
                            value: ScheduleType.blockingTime,
                            tooltip: translate('scheduleTip'),
                          },
                          {
                            label: translate('allowedTime'),
                            value: ScheduleType.allowedTime,
                          },
                        ]}
                        value={range.type}
                        onChange={(value) =>
                          this.setOptions(
                            `schedule.days['${day.value}'][${index}].type`,
                            value
                          )
                        }
                        disabled={!this.state.options.schedule.isEnabled}
                        changeLabelColorOnDisable
                        showTooltips
                      />
                    </Fragment>
                  ))}
                </Pane>
              )
            )}
            <Pane
              display="flex"
              alignItems="center"
              justifyContent="center"
              marginTop={16}
            >
              {currentScheduleDayRanges.length < 2 && (
                <Button
                  height={32}
                  iconBefore={PlusIcon}
                  marginRight={16}
                  onClick={() =>
                    this.setOptions(
                      `schedule.days['${this.state.selectedScheduleDay}']`,
                      [...currentScheduleDayRanges, newScheduleTimeRange()]
                    )
                  }
                  disabled={!this.state.options.schedule.isEnabled}
                >
                  <TruncatedText>{translate('addScheduleRange')}</TruncatedText>
                </Button>
              )}
              {currentScheduleDayRanges.length > 0 && (
                <Fragment>
                  <Button
                    height={32}
                    iconBefore={CrossIcon}
                    marginRight={16}
                    onClick={() =>
                      this.setOptions(
                        `schedule.days['${this.state.selectedScheduleDay}']`,
                        currentScheduleDayRanges.slice(0, -1)
                      )
                    }
                    disabled={!this.state.options.schedule.isEnabled}
                  >
                    <TruncatedText>{translate('deleteLastScheduleRange')}</TruncatedText>
                  </Button>
                  <Button
                    height={32}
                    iconBefore={DuplicateIcon}
                    onClick={() => this.openDialog('applyScheduleSettings')}
                    disabled={!this.state.options.schedule.isEnabled}
                  >
                    <TruncatedText>{translate('applyScheduleSettings')}</TruncatedText>
                  </Button>
                </Fragment>
              )}
            </Pane>
          </Pane>
        </Pane>
      </Fragment>
    );
  };

  renderBlacklistUrls = () => (
    <Fragment>
      <Paragraph size={300} color="muted" marginBottom={16}>
        {translate('blacklistDescription')}
      </Paragraph>
      <WebsiteList
        ref={this.blacklistComponentRef}
        list={this.state.options.blacklist}
        onChange={(list) =>
          this.setOptions({
            blacklist: list,
            blacklistLastModifiedDate: new Date().getTime(),
          })
        }
        exportFilename="blacklist.txt"
        addNewItemsOnTop={true}
      />
    </Fragment>
  );

  renderBlacklistKeywords = () => (
    <Fragment>
      <Paragraph size={300} color="muted" marginBottom={16}>
        {translate('blacklistKeywordsDescription')}
      </Paragraph>
      <WordList
        ref={this.blacklistKeywordsComponentRef}
        list={this.state.options.blacklistKeywords}
        onChange={(list) =>
          this.setOptions({
            blacklistKeywords: list,
            blacklistKeywordsLastModifiedDate: new Date().getTime(),
          })
        }
        exportFilename="blacklist_keywords.txt"
        addNewItemsOnTop={true}
      />
    </Fragment>
  );

  renderLastModifiedDate = (date) => (
    <Pane display="flex" alignItems="center" gap={4}>
      <TimeIcon size={14} color="muted" />
      <Paragraph size={300} paddingTop={2} color="muted">
        {translate('lastModified')}{' '}
        {date ? (
          <strong>{format(new Date(date), 'dd/MM/yyyy HH:mm:ss')}</strong>
        ) : (
          <Badge color="neutral" textTransform="capitalize">
            {translate('never')}
          </Badge>
        )}
      </Paragraph>
    </Pane>
  );

  renderBlacklistTab = () => (
    <Pane>
      <Pane
        display="flex"
        flexDirection={this.state.isSmallScreen ? 'column' : 'row'}
        justifyContent={this.state.isSmallScreen ? 'initial' : 'space-between'}
        marginBottom={16}
      >
        <Tablist marginBottom={this.state.isSmallScreen ? 16 : 0}>
          {this.state.blacklistTabs.map((tab) => (
            <Tab
              whiteSpace="nowrap"
              key={tab.id}
              id={tab.id}
              onSelect={() => this.setState({ selectedBlacklistTab: tab.id })}
              isSelected={tab.id === this.state.selectedBlacklistTab}
              aria-controls={`blacklist-${tab.id}`}
              fontSize={14}
              marginLeft={0}
              marginRight={8}
            >
              {tab.label}
              <Pill
                marginLeft={8}
                color={tab.id === this.state.selectedBlacklistTab ? 'blue' : 'neutral'}
              >
                {tab.getCount ? tab.getCount() : 0}
              </Pill>
            </Tab>
          ))}
        </Tablist>
        {this.renderLastModifiedDate(
          this.state.selectedBlacklistTab === 'keywords'
            ? this.state.options.blacklistKeywordsLastModifiedDate
            : this.state.options.blacklistLastModifiedDate
        )}
      </Pane>
      <Pane flex="1">
        {this.state.blacklistTabs.map((tab) => (
          <Pane
            key={tab.id}
            id={`blacklist-${tab.id}`}
            role="tabpanel"
            aria-labelledby={tab.label}
            aria-hidden={tab.id !== this.state.selectedBlacklistTab}
            display={tab.id === this.state.selectedBlacklistTab ? 'block' : 'none'}
          >
            {tab.id === 'urls' && this.renderBlacklistUrls()}
            {tab.id === 'keywords' && this.renderBlacklistKeywords()}
          </Pane>
        ))}
      </Pane>
    </Pane>
  );

  renderWhitelistUrls = () => (
    <Fragment>
      <Paragraph size={300} color="muted" marginBottom={16}>
        {translate('whitelistDescription')}
      </Paragraph>
      <WebsiteList
        ref={this.whitelistComponentRef}
        list={this.state.options.whitelist}
        onChange={(list) =>
          this.setOptions({
            whitelist: list,
            whitelistLastModifiedDate: new Date().getTime(),
          })
        }
        exportFilename="whitelist.txt"
        addNewItemsOnTop={true}
      />
    </Fragment>
  );

  renderWhitelistKeywords = () => (
    <Fragment>
      <Paragraph size={300} color="muted" marginBottom={16}>
        {translate('whitelistKeywordsDescription')}
      </Paragraph>
      <WordList
        ref={this.whitelistKeywordsComponentRef}
        list={this.state.options.whitelistKeywords}
        onChange={(list) =>
          this.setOptions({
            whitelistKeywords: list,
            whitelistKeywordsLastModifiedDate: new Date().getTime(),
          })
        }
        exportFilename="whitelist_keywords.txt"
        addNewItemsOnTop={true}
      />
    </Fragment>
  );

  renderWhitelistTab = () => (
    <Pane>
      <Pane
        display="flex"
        flexDirection={this.state.isSmallScreen ? 'column' : 'row'}
        justifyContent={this.state.isSmallScreen ? 'initial' : 'space-between'}
        marginBottom={16}
      >
        <Tablist marginBottom={this.state.isSmallScreen ? 16 : 0}>
          {this.state.whitelistTabs.map((tab) => (
            <Tab
              whiteSpace="nowrap"
              key={tab.id}
              id={tab.id}
              onSelect={() => this.setState({ selectedWhitelistTab: tab.id })}
              isSelected={tab.id === this.state.selectedWhitelistTab}
              aria-controls={`whitelist-${tab.id}`}
              fontSize={14}
              marginLeft={0}
              marginRight={8}
            >
              {tab.label}
              <Pill
                marginLeft={8}
                color={tab.id === this.state.selectedWhitelistTab ? 'blue' : 'neutral'}
              >
                {tab.getCount ? tab.getCount() : 0}
              </Pill>
            </Tab>
          ))}
        </Tablist>
        {this.renderLastModifiedDate(
          this.state.selectedWhitelistTab === 'keywords'
            ? this.state.options.whitelistKeywordsLastModifiedDate
            : this.state.options.whitelistLastModifiedDate
        )}
      </Pane>
      <Pane flex="1">
        {this.state.whitelistTabs.map((tab) => (
          <Pane
            key={tab.id}
            id={`whitelist-${tab.id}`}
            role="tabpanel"
            aria-labelledby={tab.label}
            aria-hidden={tab.id !== this.state.selectedWhitelistTab}
            display={tab.id === this.state.selectedWhitelistTab ? 'block' : 'none'}
          >
            {tab.id === 'urls' && this.renderWhitelistUrls()}
            {tab.id === 'keywords' && this.renderWhitelistKeywords()}
          </Pane>
        ))}
      </Pane>
    </Pane>
  );

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
        label={`${translate(
          this.state.options.password.isSet ? 'changePassword' : 'password'
        )}`}
        tooltip={
          this.state.options.password.isSet ? translate('changePasswordTooltip') : null
        }
        onChange={(event) => this.setOptions('password.value', event.target.value)}
        disabled={!this.state.options.password.isEnabled}
        //data-testid="password"
        marginBottom={16}
        gap={10}
        hasRandomButton
      />
      <Checkbox
        label={
          <Tooltip
            content={translate('allowActivationWithoutPasswordDescription')}
            disabled={!this.state.options.password.isEnabled}
          >
            <span>{translate('allowActivationWithoutPassword')}</span>
          </Tooltip>
        }
        checked={this.state.options.password.allowActivationWithoutPassword}
        onChange={(event) =>
          this.setOptions('password.allowActivationWithoutPassword', event.target.checked)
        }
        disabled={!this.state.options.password.isEnabled}
      />
      <Checkbox
        label={translate('allowAddingWebsitesWithoutPassword')}
        checked={this.state.options.password.allowAddingWebsitesWithoutPassword}
        onChange={(event) =>
          this.setOptions(
            'password.allowAddingWebsitesWithoutPassword',
            event.target.checked
          )
        }
        disabled={!this.state.options.password.isEnabled}
      />
      <Checkbox
        label={translate('allowUsingTimerWithoutPassword')}
        checked={this.state.options.timer.allowUsingTimerWithoutPassword}
        onChange={(event) =>
          this.setOptions('timer.allowUsingTimerWithoutPassword', event.target.checked)
        }
        disabled={
          !this.state.options.timer.isEnabled || !this.state.options.password.isEnabled
        }
      />
      <Checkbox
        label={translate('requirePasswordToUnblockWebsites')}
        checked={this.state.options.unblock.requirePassword}
        onChange={(event) =>
          this.setOptions('unblock.requirePassword', event.target.checked)
        }
        disabled={
          !this.state.options.unblock.isEnabled || !this.state.options.password.isEnabled
        }
      />
      <Checkbox
        label={
          <span className="ub-dspl_flex">
            {translate('blockAccessToExtensionsPage')}
            <Tooltip
              content={translate('blockAccessToExtensionsPageWarning')}
              disabled={!this.state.options.password.isEnabled}
            >
              <WarningSignIcon color="warning" marginLeft={8} marginTop={-2} />
            </Tooltip>
          </span>
        }
        checked={this.state.options.password.blockAccessToExtensionsPage}
        onChange={(event) =>
          this.setOptions('password.blockAccessToExtensionsPage', event.target.checked)
        }
        disabled={!this.state.options.password.isEnabled}
        margin={0}
      />
    </Fragment>
  );

  renderTimerTab = () => (
    <Fragment>
      <SwitchField
        label={translate('enableTimer')}
        tooltip={translate('enableTimerDescription')}
        labelSize={300}
        labelColor="muted"
        checked={this.state.options.timer.isEnabled}
        onChange={(event) => this.setOptions('timer.isEnabled', event.target.checked)}
        marginBottom={16}
      />
      <TimeField
        label={translate('defaultTimerValue')}
        value={this.state.options.timer.defaultValue}
        onChange={(event) => this.setOptions('timer.defaultValue', event.target.value)}
        disabled={!this.state.options.timer.isEnabled}
        marginBottom={16}
      />
      <Checkbox
        label={translate('allowStoppingTimer')}
        checked={this.state.options.timer.allowStoppingTimer}
        onChange={(event) =>
          this.setOptions('timer.allowStoppingTimer', event.target.checked)
        }
        disabled={!this.state.options.timer.isEnabled}
      />
      <Checkbox
        label={translate('displayNotificationOnComplete')}
        checked={this.state.options.timer.displayNotificationOnComplete}
        onChange={(event) =>
          this.setOptions('timer.displayNotificationOnComplete', event.target.checked)
        }
        disabled={!this.state.options.timer.isEnabled}
        margin={0}
      />
    </Fragment>
  );

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
        disabled={!this.state.options.logs.isEnabled}
      />
    </Fragment>
  );

  renderMiscTab = () => (
    <Fragment>
      <SwitchField
        label={translate('hideReportIssueButton')}
        checked={this.state.options.misc.hideReportIssueButton}
        onChange={(event) =>
          this.setOptions('misc.hideReportIssueButton', event.target.checked)
        }
        marginBottom={16}
      />
      <SwitchField
        label={translate('showAddWebsitePrompt')}
        tooltip={translate('showAddWebsitePromptTooltip')}
        checked={this.state.options.misc.showAddWebsitePrompt}
        onChange={(event) =>
          this.setOptions('misc.showAddWebsitePrompt', event.target.checked)
        }
        marginBottom={16}
      />
      <SwitchField
        label={translate('enableOnBrowserStartup')}
        checked={this.state.options.misc.enableOnBrowserStartup}
        onChange={(event) =>
          this.setOptions('misc.enableOnBrowserStartup', event.target.checked)
        }
      />
    </Fragment>
  );

  renderAboutTab = () => (
    <div className="about">
      <h3 className="title">{translate('appName')}</h3>
      <div className="block">
        <div className="text">{translate('appDesc')}</div>
        <a
          className="link"
          href="https://github.com/AXeL-dev/distract-me-not/releases/latest"
          target="_blank"
          rel="noreferrer"
        >{`${translate('version')} ${version}`}</a>
        <a
          className="link"
          href="https://github.com/AXeL-dev/distract-me-not/blob/master/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          {translate('license')}
        </a>
        <a
          className="link"
          href="https://github.com/AXeL-dev/distract-me-not/wiki/FAQ"
          target="_blank"
          rel="noreferrer"
        >
          {translate('FAQ')}
        </a>
      </div>
      <div className="small-text">{translate('supportDeveloper')}</div>
    </div>
  );

  render() {
    return (
      <Pane
        display="flex"
        padding={16}
        maxWidth={this.state.isSmallScreen ? '100%' : 1080}
        flexDirection={this.state.isSmallScreen ? 'column' : 'row'}
      >
        <Pane minWidth={this.state.isSmallScreen ? '100%' : 250}>
          <Header height={50} justifyContent="start" marginBottom={10} noBorderBottom />
          <Tablist
            display="flex"
            flexDirection={this.state.isSmallScreen ? 'row' : 'column'}
            flexBasis={this.state.isSmallScreen ? 'auto' : 240}
            marginRight={this.state.isSmallScreen ? 0 : 16}
            marginBottom={this.state.isSmallScreen ? 16 : 0}
            overflow={this.state.isSmallScreen ? 'auto' : 'initial'}
            padding={this.state.isSmallScreen ? 2 : 0}
            gap={this.state.isSmallScreen ? 5 : 0}
          >
            {this.state.tabs.map((tab) => (
              <Tab
                direction="vertical"
                whiteSpace="nowrap"
                key={tab.id}
                id={tab.id}
                onSelect={() => this.selectTab(tab.id)}
                isSelected={tab.id === this.state.selectedTab}
                aria-controls={`panel-${tab.id}`}
                fontSize={14}
                height={30}
                marginBottom={this.state.isSmallScreen ? 0 : 6}
                disabled={tab.disabled}
              >
                {tab.label}
              </Tab>
            ))}
          </Tablist>
        </Pane>
        <Pane flex="1">
          <Pane padding={16} border="muted">
            {this.state.tabs.map((tab) => (
              <Pane
                key={tab.id}
                id={`panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={tab.label}
                aria-hidden={tab.id !== this.state.selectedTab}
                display={tab.id === this.state.selectedTab ? 'block' : 'none'}
                //maxWidth={500}
              >
                {tab.id === 'blocking' && this.renderBlockingTab()}
                {tab.id === 'unblocking' && this.renderUnblockingTab()}
                {tab.id === 'schedule' && this.renderScheduleTab()}
                {tab.id === 'blacklist' && this.renderBlacklistTab()}
                {tab.id === 'whitelist' && this.renderWhitelistTab()}
                {tab.id === 'password' && this.renderPasswordTab()}
                {tab.id === 'timer' && this.renderTimerTab()}
                {tab.id === 'logs' && this.renderLogsTab()}
                {tab.id === 'misc' && this.renderMiscTab()}
                {tab.id === 'about' && this.renderAboutTab()}
              </Pane>
            ))}
          </Pane>
          <Pane
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={12}
            marginTop={16}
          >
            {this.state.selectedTab === 'about' ? (
              <Button
                height={32}
                appearance="primary"
                iconBefore={HeartIcon}
                onClick={this.openDonationLink}
              >
                {translate('donate')}
              </Button>
            ) : (
              <>
                {this.state.selectedTab === 'misc' && (
                  <>
                    <Button
                      height={32}
                      appearance="primary"
                      iconBefore={ImportIcon}
                      onClick={() => {
                        this.importFileInputRef.current.click();
                      }}
                    >
                      {translate('importSettings')}
                    </Button>
                    <Button
                      height={32}
                      appearance="primary"
                      iconBefore={ExportIcon}
                      onClick={this.export}
                    >
                      {translate('exportSettings')}
                    </Button>
                  </>
                )}
                <Button
                  height={32}
                  appearance="primary"
                  iconBefore={TickIcon}
                  onClick={this.save}
                >
                  {translate('save')}
                </Button>
                {this.state.selectedTab === 'logs' && this.state.options.logs.isEnabled && (
                  <Button
                    height={32}
                    appearance="primary"
                    iconBefore={HistoryIcon}
                    onClick={() => this.openPage('/logs')}
                  >
                    {translate('openLogs')}
                  </Button>
                )}
              </>
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
          shouldCloseOnOverlayClick={false}
          topOffset="24vmin"
          minHeightContent="auto"
          contentContainerProps={{ padding: 16 }}
          containerProps={{ className: 'schedule-dialog' }}
        >
          {translate('confirmApplyScheduleSettings')}
        </Dialog>
        <input
          ref={this.importFileInputRef}
          type="file"
          className="hidden"
          accept=".json"
          onClick={(event) => (event.target.value = '')}
          onChange={(event) => {
            const file = event.target.files[0];
            this.import(file);
          }}
          data-testid="settings-file-input"
        />
      </Pane>
    );
  }
}
