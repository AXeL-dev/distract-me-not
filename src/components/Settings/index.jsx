import React, { Component, Fragment } from 'react';
import { Pane, Tablist, Tab, SelectField, Checkbox, TextInputField, Button, TickIcon, Paragraph, toaster } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { debug, isDevEnv } from 'helpers/debug';
import { Mode, Action, modes, actions, defaultMode, defaultBlacklist, defaultWhitelist, defaultSchedule, defaultUnblockOnceTimeout } from 'helpers/block';
import { sendMessage, storage } from 'helpers/webext';
import { DaysOfWeek } from 'helpers/date';
import { hash } from 'helpers/crypt';
import { SwitchField, SegmentedControlField, TimeField, PasswordField, MultiSelectField, WebsiteList, NumberField } from 'components';
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
        { label: translate('schedule'), id: 'schedule' },
        { label: translate('password'), id: 'password' },
        { label: translate('blacklist'), id: 'blacklist', disabled: defaultMode === Mode.whitelist },
        { label: translate('whitelist'), id: 'whitelist', disabled: defaultMode === Mode.blacklist },
        { label: translate('miscellaneous'), id: 'misc' },
      ],
      allScheduleDays: DaysOfWeek.map(day => ({ label: translate(day), value: day })),
      options: {
        isEnabled: true,
        mode: defaultMode,
        action: Action.blockTab,
        blockTab: {
          message: '',
          displayBlankPage: false
        },
        redirectToUrl: {
          url: ''
        },
        schedule: defaultSchedule,
        blacklist: isDevEnv ? defaultBlacklist : [],
        whitelist: isDevEnv ? defaultWhitelist : [],
        password: {
          isEnabled: props.enablePassword || false,
          isSet: false,
          value: '',
          hash: '',
          unblockWebsites: false,
          unblockOnceTimeout: defaultUnblockOnceTimeout
        },
        misc: {
          enableOnBrowserStartup: false,
        }
      }
    };
  }

  componentDidMount() {
    storage.get({
      isEnabled: this.state.options.isEnabled,
      mode: this.state.options.mode,
      action: this.state.options.action,
      message: this.state.options.blockTab.message,
      displayBlankPage: this.state.options.blockTab.displayBlankPage,
      redirectUrl: this.state.options.redirectToUrl.url,
      enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
      schedule: this.state.options.schedule,
      password: this.state.options.password,
      blacklist: defaultBlacklist,
      whitelist: defaultWhitelist,
    }).then(async (items) => {
      if (items) {
        // Update state
        this.setOptions({
          isEnabled: items.isEnabled || await sendMessage('getIsEnabled'),
          mode: items.mode,
          action: items.action,
          blockTab: {
            message: items.message,
            displayBlankPage: items.displayBlankPage
          },
          redirectToUrl: {
            url: items.redirectUrl
          },
          schedule: {
            // merge both state & storage values
            ...this.state.options.schedule,
            ...items.schedule
          },
          password: {
            ...this.state.options.password,
            ...items.password,
            isSet: !!(items.password.hash && items.password.hash.length)
          },
          blacklist: items.blacklist,
          whitelist: items.whitelist,
          misc: {
            enableOnBrowserStartup: items.enableOnBrowserStartup
          }
        });
        // Disable whitelist/blacklist tab depending on active mode
        this.toggleListTabs(items.mode);
        // Update WebsiteList components
        this.blacklistComponentRef.current.setList(items.blacklist);
        this.whitelistComponentRef.current.setList(items.whitelist);
      }
    });
  }

  changeMode = (value) => {
    this.setOptions({ mode: value });
    this.toggleListTabs(value);
  }

  toggleListTabs = (mode) => {
    const tabIdToDisable = mode === Mode.blacklist ? 'whitelist' : 'blacklist';
    this.setState({
      tabs: this.state.tabs.map(tab => {
        if (tab.id === tabIdToDisable) {
          tab.disabled = true;
        } else if (tab.disabled) {
          tab.disabled = false;
        }
        return tab;
      })
    });
  }

  /**
   * Set option(s) in options state
   * ex: this.setOptions({ key: value })
   *     this.setOptions('parentKey', { key: value })
   *     this.setOptions('parentKey', 'subKey', { key: value })
   * 
   * @param  {...any} params 
   */
  setOptions = (...params) => {
    switch (params.length) {
      case 1:
        this.setState({
          options: {
            ...this.state.options,
            ...params[0]
          }
        });
        break;
      case 2:
        this.setState({
          options: {
            ...this.state.options,
            [params[0]]: {
              ...this.state.options[params[0]],
              ...params[1]
            }
          }
        });
        break;
      case 3:
        this.setState({
          options: {
            ...this.state.options,
            [params[0]]: {
              ...this.state.options[params[0]],
              [params[1]]: {
                ...this.state.options[params[0]][params[1]],
                ...params[2]
              }
            }
          }
        });
        break;
    }
  }

  save = () => {
    debug.log('save:', this.state.options);
    if (this.state.options.password.isEnabled && this.state.options.password.value.length < 8 && (
      !this.state.options.password.isSet || this.state.options.password.value.length
    )) {
      toaster.danger(translate('passwordIsShort'), { id: 'settings-toaster' });
      return;
    }
    storage.set({
      isEnabled: this.state.options.isEnabled,
      mode: this.state.options.mode,
      action: this.state.options.action,
      message: this.state.options.blockTab.message,
      displayBlankPage: this.state.options.blockTab.displayBlankPage,
      redirectUrl: this.state.options.redirectToUrl.url,
      enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
      schedule: this.state.options.schedule,
      password: {
        isEnabled: this.state.options.password.isEnabled,
        hash: this.state.options.password.isEnabled ? ( // if password protection is enabled
          this.state.options.password.value.length ? ( // + password length is > 0
            hash(this.state.options.password.value) // hash & save the new password
          ) : (
            this.state.options.password.hash // else, use the old hash
          )
        ) : (
          '' // else if protection is disabled, set hash to empty string
        ),
        unblockWebsites: this.state.options.password.unblockWebsites,
        unblockOnceTimeout: this.state.options.password.unblockOnceTimeout
      },
      blacklist: this.state.options.blacklist,
      whitelist: this.state.options.whitelist,
    }).then(success => {
      if (success) {
        // Update background script
        sendMessage('setIsEnabled', this.state.options.isEnabled);
        sendMessage('setMode', this.state.options.mode);
        sendMessage('setAction', this.state.options.action);
        sendMessage('setRedirectUrl', this.state.options.redirectToUrl.url);
        sendMessage('setSchedule', this.state.options.schedule);
        sendMessage('setBlacklist', this.state.options.blacklist);
        sendMessage('setWhitelist', this.state.options.whitelist);
        sendMessage('setUnblockOnceTimeout', this.state.options.password.unblockOnceTimeout);
      }
      // Show success message (keep out of success condition to ensure it's executed on unit tests & dev env.)
      toaster.success(translate('settingsSaved'), { id: 'settings-toaster' });
    });
  }

  render() {
    return (
      <Pane padding={16} minWidth={580}>
        <Tablist marginBottom={16}>
          {this.state.tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              id={tab.id}
              onSelect={() => this.setState({ selectedTabIndex: index })}
              isSelected={index === this.state.selectedTabIndex}
              aria-controls={`panel-${tab.id}`}
              fontSize={14}
              disabled={tab.disabled}
            >
              {tab.label}
            </Tab>
          ))}
        </Tablist>
        <Pane padding={16} border="muted" flex="1">
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
              {tab.id === 'blocking' && (
                <Fragment>
                  <SwitchField
                    label={translate('status')}
                    checked={this.state.options.isEnabled}
                    onChange={event => this.setOptions({ isEnabled: event.target.checked })}
                    height={24}
                    marginBottom={16}
                  />
                  <SegmentedControlField
                    name="mode"
                    label={translate('mode')}
                    options={modes}
                    value={this.state.options.mode}
                    onChange={this.changeMode}
                    width={200}
                    marginBottom={16}
                  />
                  <Paragraph size={300} color="muted" marginBottom={16}>{translate('blockingDescription')}</Paragraph>
                  <SelectField
                    label={translate('defaultAction')}
                    value={this.state.options.action}
                    onChange={event => this.setOptions({ action: event.target.value })}
                    marginBottom={16}
                  >
                    {actions.map(action => (
                      <option key={action.value} value={action.value}>{action.label}</option>
                    ))}
                  </SelectField>
                  {this.state.options.action === Action.blockTab && (
                    <Fragment>
                      <TextInputField
                        label={translate('blockingMessage')}
                        placeholder={translate('defaultBlockingMessage')}
                        value={this.state.options.blockTab.message}
                        onChange={event => this.setOptions('blockTab', { message: event.target.value })}
                        disabled={this.state.options.blockTab.displayBlankPage}
                        marginBottom={16}
                      />
                      <Checkbox
                        label={translate('displayBlankPage')}
                        checked={this.state.options.blockTab.displayBlankPage}
                        onChange={event => this.setOptions('blockTab', { displayBlankPage: event.target.checked })}
                      />
                    </Fragment>
                  )}
                  {this.state.options.action === Action.redirectToUrl && (
                    <TextInputField
                      label={translate('url')}
                      placeholder={translate('redirectUrlExample')}
                      value={this.state.options.redirectToUrl.url}
                      onChange={event => this.setOptions('redirectToUrl', { url: event.target.value })}
                      marginBottom={16}
                    />
                  )}
                </Fragment>
              )}
              {tab.id === 'schedule' && (
                <Fragment>
                  <SwitchField
                    label={translate('scheduleDescription')}
                    labelSize={300}
                    labelColor="muted"
                    checked={this.state.options.schedule.isEnabled}
                    onChange={event => this.setOptions('schedule', { isEnabled: event.target.checked })}
                    marginBottom={16}
                  />
                  <TimeField
                    label={translate('scheduleStartTime')}
                    value={this.state.options.schedule.time.start}
                    onChange={event => this.setOptions('schedule', 'time', { start: event.target.value })}
                    disabled={!this.state.options.schedule.isEnabled}
                    marginBottom={16}
                  />
                  <TimeField
                    label={translate('scheduleEndTime')}
                    value={this.state.options.schedule.time.end}
                    onChange={event => this.setOptions('schedule', 'time', { end: event.target.value })}
                    disabled={!this.state.options.schedule.isEnabled}
                    marginBottom={16}
                  />
                  <MultiSelectField
                    label={translate('scheduleDays')}
                    tooltip={translate('scheduleDaysDescription')}
                    placeholder={translate('select')}
                    options={this.state.allScheduleDays}
                    selected={this.state.options.schedule.days}
                    onChange={value => this.setOptions('schedule', { days: value })}
                    disabled={!this.state.options.schedule.isEnabled}
                  />
                </Fragment>
              )}
              {tab.id === 'password' && (
                <Fragment>
                  <SwitchField
                    label={translate('enablePasswordProtection')}
                    labelSize={300}
                    labelColor="muted"
                    tooltip={translate('passwordDescription')}
                    checked={this.state.options.password.isEnabled}
                    onChange={event => this.setOptions('password', { isEnabled: event.target.checked })}
                    marginBottom={16}
                  />
                  <PasswordField
                    label={`${translate(this.state.options.password.isSet ? 'changePassword' : 'password')}:`}
                    tooltip={this.state.options.password.isSet ? translate('changePasswordTooltip') : null}
                    onChange={event => this.setOptions('password', { value: event.target.value })}
                    disabled={!this.state.options.password.isEnabled}
                    //data-testid="password"
                  />
                  {this.state.options.action === Action.blockTab && (
                    <Fragment>
                      <Checkbox
                        label={translate('unblockWebsitesWithPassword')}
                        checked={this.state.options.password.unblockWebsites}
                        onChange={event => this.setOptions('password', { unblockWebsites: event.target.checked })}
                        disabled={!this.state.options.password.isEnabled}
                      />
                      {this.state.options.password.unblockWebsites && (
                        <NumberField
                          label={translate('unblockOnceTimeout')}
                          min={5}
                          max={60}
                          inputWidth={60}
                          value={this.state.options.password.unblockOnceTimeout}
                          onChange={(value) => this.setOptions('password', { unblockOnceTimeout: value })}
                          suffix={translate('seconds')}
                          disabled={!this.state.options.password.isEnabled}
                        />
                      )}
                    </Fragment>
                  )}
                </Fragment>
              )}
              {tab.id === 'blacklist' && (
                <Fragment>
                  <Paragraph size={300} color="muted" marginBottom={16}>{translate('blacklistDescription')}</Paragraph>
                  <WebsiteList
                    ref={this.blacklistComponentRef}
                    list={this.state.options.blacklist}
                    onChange={list => this.setOptions({ blacklist: list })}
                    exportFilename="blacklist.txt"
                    addNewItemsOnTop={true}
                  />
                </Fragment>
              )}
              {tab.id === 'whitelist' && (
                <Fragment>
                  <Paragraph size={300} color="muted" marginBottom={16}>{translate('whitelistDescription')}</Paragraph>
                  <WebsiteList
                    ref={this.whitelistComponentRef}
                    list={this.state.options.whitelist}
                    onChange={list => this.setOptions({ whitelist: list })}
                    exportFilename="whitelist.txt"
                    addNewItemsOnTop={true}
                  />
                </Fragment>
              )}
              {tab.id === 'misc' && (
                <Fragment>
                  <SwitchField
                    label={translate('enableOnBrowserStartup')}
                    checked={this.state.options.misc.enableOnBrowserStartup}
                    onChange={event => this.setOptions('misc', { enableOnBrowserStartup: event.target.checked })}
                    //marginBottom={16}
                  />
                </Fragment>
              )}
            </Pane>
          ))}
        </Pane>
        <Pane display="flex" alignItems="center" justifyContent="center" marginTop={16}>
          <Button
            height={32}
            appearance="primary"
            iconBefore={TickIcon}
            onClick={this.save}
          >
            {translate('save')}
          </Button>
        </Pane>
      </Pane>
    );
  }
}
