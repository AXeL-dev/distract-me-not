import React, { Component, Fragment } from 'react';
import { Pane, Tablist, SidebarTab, SelectField, Checkbox, TextInputField, Button, TickIcon, Paragraph, toaster, HeartIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { debug, isDevEnv } from 'helpers/debug';
import { Mode, Action, modes, actions, defaultAction, defaultMode, defaultBlacklist, defaultWhitelist, defaultSchedule, defaultUnblock } from 'helpers/block';
import { sendMessage, storage } from 'helpers/webext';
import { DaysOfWeek } from 'helpers/date';
import { hash } from 'helpers/crypt';
import { Header, SwitchField, SegmentedControlField, TimeField, PasswordField, MultiSelectField, WebsiteList, NumberField } from 'components';
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
        { label: translate('miscellaneous'), id: 'misc' },
        { label: translate('about'), id: 'about' },
      ],
      allScheduleDays: DaysOfWeek.map(day => ({ label: translate(day), value: day })),
      options: {
        isEnabled: true,
        mode: '',//defaultMode,
        action: defaultAction,
        blockTab: {
          message: '',
          displayBlankPage: false
        },
        redirectToUrl: {
          url: ''
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
      unblock: this.state.options.unblock,
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
          unblock: {
            ...this.state.options.unblock,
            ...items.unblock,
          },
          blacklist: items.blacklist,
          whitelist: items.whitelist,
          misc: {
            enableOnBrowserStartup: items.enableOnBrowserStartup
          }
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
      tabs: this.state.tabs.map(tab => {
        if (tab.id === id) {
          tab.disabled = disabled;
        }
        return tab;
      })
    });
  }

  changeMode = (value) => {
    this.setOptions('mode', value);
    this.toggleListTabs(value);
  }

  toggleListTabs = (mode) => {
    this.setState({
      tabs: this.state.tabs.map(tab => {
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
      })
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
            ...params[0]
          }
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
      blacklist: this.state.options.blacklist,
      whitelist: this.state.options.whitelist,
      unblock: this.state.options.unblock,
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
      },
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
        sendMessage('setUnblockOnceTimeout', this.state.options.unblock.unblockOnceTimeout);
        sendMessage('setAutoReblockOnTimeout', this.state.options.unblock.autoReblockOnTimeout);
      }
      // Show success message (keep out of success condition to ensure it's executed on unit tests & dev env.)
      toaster.success(translate('settingsSaved'), { id: 'settings-toaster' });
    });
  }

  openDonationLink = () => {
    window.open('https://www.paypal.com/paypalme/axeldev', '_blank');
  }

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
                {tab.id === 'blocking' && (
                  <Fragment>
                    <SwitchField
                      label={translate('status')}
                      checked={this.state.options.isEnabled}
                      onChange={event => this.setOptions('isEnabled', event.target.checked)}
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
                          {translate(this.state.options.mode === Mode.whitelist ? 'blockingWhitelistDescription' : 'blockingBlacklistDescription')}
                        </Paragraph>
                        <SelectField
                          label={translate('defaultAction')}
                          value={this.state.options.action}
                          onChange={this.changeAction}
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
                              onChange={event => this.setOptions('blockTab.message', event.target.value)}
                              disabled={this.state.options.blockTab.displayBlankPage}
                              marginBottom={16}
                            />
                            <Checkbox
                              label={translate('displayBlankPage')}
                              checked={this.state.options.blockTab.displayBlankPage}
                              onChange={event => this.setOptions('blockTab.displayBlankPage', event.target.checked)}
                            />
                          </Fragment>
                        )}
                        {this.state.options.action === Action.redirectToUrl && (
                          <TextInputField
                            label={translate('url')}
                            placeholder={translate('redirectUrlExample')}
                            value={this.state.options.redirectToUrl.url}
                            onChange={event => this.setOptions('redirectToUrl.url', event.target.value)}
                            marginBottom={16}
                          />
                        )}
                      </Fragment>
                    )}
                  </Fragment>
                )}
                {tab.id === 'unblocking' && (
                  <Fragment>
                    <SwitchField
                      label={translate('enableUnblocking')}
                      labelSize={300}
                      labelColor="muted"
                      tooltip={translate('unblockingDescription')}
                      checked={this.state.options.unblock.isEnabled}
                      onChange={event => this.setOptions('unblock.isEnabled', event.target.checked)}
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
                      label={translate('autoReblockOnTimeout')}
                      checked={this.state.options.unblock.autoReblockOnTimeout}
                      onChange={event => this.setOptions('unblock.autoReblockOnTimeout', event.target.checked)}
                      disabled={!this.state.options.unblock.isEnabled}
                    />
                    <Checkbox
                      label={translate('requirePasswordToUnblockWebsites')}
                      checked={this.state.options.unblock.requirePassword}
                      onChange={event => this.setOptions('unblock.requirePassword', event.target.checked)}
                      disabled={!this.state.options.unblock.isEnabled || !this.state.options.password.isEnabled}
                    />
                  </Fragment>
                )}
                {tab.id === 'schedule' && (
                  <Fragment>
                    <SwitchField
                      label={translate('scheduleDescription')}
                      labelSize={300}
                      labelColor="muted"
                      checked={this.state.options.schedule.isEnabled}
                      onChange={event => this.setOptions('schedule.isEnabled', event.target.checked)}
                      marginBottom={16}
                    />
                    <TimeField
                      label={translate('scheduleStartTime')}
                      value={this.state.options.schedule.time.start}
                      onChange={event => this.setOptions('schedule.time.start', event.target.value)}
                      disabled={!this.state.options.schedule.isEnabled}
                      marginBottom={16}
                    />
                    <TimeField
                      label={translate('scheduleEndTime')}
                      value={this.state.options.schedule.time.end}
                      onChange={event => this.setOptions('schedule.time.end', event.target.value)}
                      disabled={!this.state.options.schedule.isEnabled}
                      marginBottom={16}
                    />
                    <MultiSelectField
                      label={translate('scheduleDays')}
                      tooltip={translate('scheduleDaysDescription')}
                      placeholder={translate('select')}
                      options={this.state.allScheduleDays}
                      selected={this.state.options.schedule.days}
                      onChange={value => this.setOptions('schedule.days', value)}
                      disabled={!this.state.options.schedule.isEnabled}
                    />
                  </Fragment>
                )}
                {tab.id === 'blacklist' && (
                  <Fragment>
                    <Paragraph size={300} color="muted" marginBottom={16}>{translate('blacklistDescription')}</Paragraph>
                    <WebsiteList
                      ref={this.blacklistComponentRef}
                      list={this.state.options.blacklist}
                      onChange={list => this.setOptions('blacklist', list)}
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
                      onChange={list => this.setOptions('whitelist', list)}
                      exportFilename="whitelist.txt"
                      addNewItemsOnTop={true}
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
                      onChange={event => this.setOptions('password.isEnabled', event.target.checked)}
                      marginBottom={16}
                    />
                    <PasswordField
                      label={`${translate(this.state.options.password.isSet ? 'changePassword' : 'password')}`}
                      tooltip={this.state.options.password.isSet ? translate('changePasswordTooltip') : null}
                      onChange={event => this.setOptions('password.value', event.target.value)}
                      disabled={!this.state.options.password.isEnabled}
                      //data-testid="password"
                    />
                  </Fragment>
                )}
                {tab.id === 'misc' && (
                  <Fragment>
                    <SwitchField
                      label={translate('enableOnBrowserStartup')}
                      checked={this.state.options.misc.enableOnBrowserStartup}
                      onChange={event => this.setOptions('misc.enableOnBrowserStartup', event.target.checked)}
                      //marginBottom={16}
                    />
                  </Fragment>
                )}
                {tab.id === 'about' && (
                  <div className="about">
                    <h3 className="title">
                      {translate('appName')}
                    </h3>
                    <div className="block">
                      <div className="text">
                        {translate('appDesc')}
                      </div>
                      <a className="link" href="https://github.com/AXeL-dev/distract-me-not/releases" target="_blank">{`${translate('version')} ${version}`}</a>
                      <a className="link" href="https://github.com/AXeL-dev/distract-me-not/blob/master/LICENSE" target="_blank">{translate('license')}</a>
                      <a className="link" href="https://github.com/AXeL-dev/distract-me-not" target="_blank">Github</a>
                    </div>
                    <div className="small-text">
                      {translate('supportDeveloper')}
                    </div>
                  </div>
                )}
              </Pane>
            ))}
          </Pane>
          <Pane display="flex" alignItems="center" justifyContent="center" marginTop={16}>
            {this.state.selectedTabIndex === this.state.tabs.findIndex(tab => tab.id === 'about') ? (
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
      </Pane>
    );
  }
}
