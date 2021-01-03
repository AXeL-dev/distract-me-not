import React, { Component, Fragment } from 'react';
import { Pane, Tablist, Tab, SelectField, Checkbox, TextInputField, Button, TickIcon, Paragraph, toaster } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { debug, isDevEnv } from '../../helpers/debug';
import { Action, defaultBlacklist, defaultWhitelist } from '../../helpers/block';
import { sendMessage, storage } from '../../helpers/webext';
import SwitchField from '../shared/switch-field/SwitchField';
import TimeField from '../shared/time-field/TimeField';
import WebsiteList from '../shared/website-list/WebsiteList';
import './Settings.scss';

export default class Settings extends Component {

  constructor(props) {
    super(props);
    this.blacklistComponentRef = React.createRef();
    this.whitelistComponentRef = React.createRef();
    this.state = {
      selectedTabIndex: 0,
      tabs: [
        { label: translate('blocking'), id: 'blocking' },
        { label: translate('schedule'), id: 'schedule' },
        { label: translate('blacklist'), id: 'blacklist' },
        { label: translate('whitelist'), id: 'whitelist' },
        { label: translate('miscellaneous'), id: 'misc' },
        //{ label: translate('password'), id: 'password' },
      ],
      actions: [
        { label: translate('displayErrorMessage'), value: Action.blockTab },
        { label: translate('redirectToUrl'), value: Action.redirectToUrl },
        { label: translate('closeTab'), value: Action.closeTab },
      ],
      options: {
        action: Action.blockTab,
        blockTab: {
          errorMessage: '',
          disableKeyboard: false
        },
        redirectToUrl: {
          url: ''
        },
        schedule: {
          isEnabled: false,
          from: '',
          to: ''
        },
        blacklist: isDevEnv ? defaultBlacklist : [],
        whitelist: isDevEnv ? defaultWhitelist : [],
        misc: {
          enableOnBrowserStartup: false,
        }
      }
    };
  }

  componentDidMount() {
    storage.get({
      action: this.state.options.action,
      errorMessage: this.state.options.blockTab.errorMessage,
      redirectUrl: this.state.options.redirectToUrl.url,
      disableKeyboard: this.state.options.blockTab.disableKeyboard,
      enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
      schedule: this.state.options.schedule,
      blacklist: defaultBlacklist,
      whitelist: defaultWhitelist,
    }).then((items) => {
      if (items) {
        // Update state
        this.setOptions({
          action: items.action,
          blockTab: {
            errorMessage: items.errorMessage,
            disableKeyboard: items.disableKeyboard
          },
          redirectToUrl: {
            url: items.redirectUrl
          },
          schedule: {
            isEnabled: items.schedule.isEnabled,
            from: items.schedule.from,
            to: items.schedule.to
          },
          blacklist: items.blacklist,
          whitelist: items.whitelist,
          misc: {
            enableOnBrowserStartup: items.enableOnBrowserStartup
          }
        });
        // Update WebsiteList components
        this.blacklistComponentRef.current.setList(items.blacklist);
        this.whitelistComponentRef.current.setList(items.whitelist);
      }
    });
  }

  /**
   * Set option(s) in options state
   * ex: this.setOptions({ key: value })
   *     this.setOptions('parentKey', { key: value })
   * 
   * @param  {...any} params 
   */
  setOptions = (...params) => {
    if (params.length === 2) {
      this.setState({
        options: {
          ...this.state.options,
          [params[0]]: {
            ...this.state.options[params[0]],
            ...params[1]
          }
        }
      });
    } else {
      this.setState({
        options: {
          ...this.state.options,
          ...params[0]
        }
      });
    }
  }

  save = () => {
    debug.log('save:', this.state.options);
    storage.set({
      action: this.state.options.action,
      errorMessage: this.state.options.blockTab.errorMessage,
      redirectUrl: this.state.options.redirectToUrl.url,
      disableKeyboard: this.state.options.blockTab.disableKeyboard,
      enableOnBrowserStartup: this.state.options.misc.enableOnBrowserStartup,
      schedule: this.state.options.schedule,
      blacklist: this.state.options.blacklist,
      whitelist: this.state.options.whitelist,
    }).then(success => {
      if (success || isDevEnv) {
        // Update background script
        if (success) {
          sendMessage('setAction', this.state.options.action);
          sendMessage('setRedirectUrl', this.state.options.redirectToUrl.urld);
          sendMessage('setDisableKeyboard', this.state.options.blockTab.disableKeyboard);
          sendMessage('setBlacklist', this.state.options.blacklist);
          sendMessage('setWhitelist', this.state.options.whitelist);
        }
        // Show success message
        toaster.success(translate('settingsSaved'), { id: 'settings-toaster' });
      }
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
              {tab.id === 'blocking' &&
                <Fragment>
                  <SelectField
                    label={translate('defaultAction')}
                    hint={translate('defaultActionHint')}
                    value={this.state.options.action}
                    onChange={event => this.setOptions({ action: event.target.value })}
                    marginBottom={16}
                  >
                    {this.state.actions.map(action => (
                      <option key={action.value} value={action.value}>{action.label}</option>
                    ))}
                  </SelectField>
                  {this.state.options.action === Action.blockTab &&
                    <Fragment>
                      <TextInputField
                        label={translate('errorMessage')}
                        placeholder={translate('defaultErrorMessage')}
                        value={this.state.options.blockTab.errorMessage}
                        onChange={event => this.setOptions('blockTab', { errorMessage: event.target.value })}
                        marginBottom={16}
                      />
                      <Checkbox
                        label={translate('disableKeyboardWhenErrorMessageIsDisplayed')}
                        checked={this.state.options.blockTab.disableKeyboard}
                        onChange={event => this.setOptions('blockTab', { disableKeyboard: event.target.checked })}
                      />
                    </Fragment>
                  }
                  {this.state.options.action === Action.redirectToUrl &&
                    <TextInputField
                      label={translate('url')}
                      placeholder={translate('redirectUrlExample')}
                      value={this.state.options.redirectToUrl.url}
                      onChange={event => this.setOptions('redirectToUrl', { url: event.target.value })}
                      marginBottom={16}
                    />
                  }
                </Fragment>
              }
              {tab.id === 'schedule' &&
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
                    label={translate('timeFrom')}
                    value={this.state.options.schedule.from}
                    onChange={event => this.setOptions('schedule', { from: event.target.value })}
                    disabled={!this.state.options.schedule.isEnabled}
                    marginBottom={16}
                  />
                  <TimeField
                    label={translate('timeTo')}
                    value={this.state.options.schedule.to}
                    onChange={event => this.setOptions('schedule', { to: event.target.value })}
                    disabled={!this.state.options.schedule.isEnabled}
                  />
                </Fragment>
              }
              {tab.id === 'blacklist' &&
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
              }
              {tab.id === 'whitelist' &&
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
              }
              {tab.id === 'misc' &&
                <Fragment>
                  <SwitchField
                    label={translate('enableOnBrowserStartup')}
                    checked={this.state.options.misc.enableOnBrowserStartup}
                    onChange={event => this.setOptions('misc', { enableOnBrowserStartup: event.target.checked })}
                    //marginBottom={16}
                  />
                </Fragment>
              }
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
