import { Component, Fragment } from 'react';
import { Pane, Tablist, Tab, SelectField, Checkbox, TextInputField, Button, TickIcon, Paragraph, toaster } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { debug, isDevEnv } from '../../helpers/debug';
import SwitchField from '../shared/switch-field/SwitchField';
import TimeField from '../shared/time-field/TimeField';
import WebsiteList from '../shared/website-list/WebsiteList';
import './Settings.scss';

const blacklistExample = [
  'www.facebook.com',
  'www.youtube.com',
  'www.twitter.com'
];

const whitelistExample = [
  'www.google.com',
  'www.wikipedia.com'
];

export default class Settings extends Component {

  constructor(props) {
    super(props);
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
        { label: translate('displayErrorMessage'), value: 'blockTab' },
        { label: translate('redirectToUrl'), value: 'redirectToUrl' },
        { label: translate('closeTab'), value: 'closeTab' },
      ],
      options: {
        action: 'blockTab',
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
        blacklist: isDevEnv ? blacklistExample : [],
        whitelist: isDevEnv ? whitelistExample : [],
        misc: {
          enableOnBrowserStartup: false,
        }
      }
    };
  }

  /**
   * Set an option in options state
   * ex: this.setOption({ key: value })
   *     this.setOption('parentKey', { key: value })
   * 
   * @param  {...any} params 
   */
  setOption = (...params) => {
    if (params.length === 2) {
      this.setState({
        options: {
          ...this.state.options,
          ...{
            [params[0]]: {
              ...this.state.options[params[0]],
              ...params[1]
            }
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
    toaster.success(translate('settingsSaved'), { id: 'settings-toaster' });
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
                    onChange={event => this.setOption({ action: event.target.value })}
                    marginBottom={16}
                  >
                    {this.state.actions.map(action => (
                      <option key={action.value} value={action.value}>{action.label}</option>
                    ))}
                  </SelectField>
                  {this.state.options.action === 'blockTab' &&
                    <Fragment>
                      <TextInputField
                        label={translate('errorMessage')}
                        placeholder={translate('defaultErrorMessage')}
                        value={this.state.options.blockTab.errorMessage}
                        onChange={event => this.setOption('blockTab', { errorMessage: event.target.value })}
                        marginBottom={16}
                      />
                      <Checkbox
                        label={translate('disableKeyboardWhenErrorMessageIsDisplayed')}
                        checked={this.state.options.blockTab.disableKeyboard}
                        onChange={event => this.setOption('blockTab', { disableKeyboard: event.target.checked })}
                      />
                    </Fragment>
                  }
                  {this.state.options.action === 'redirectToUrl' &&
                    <TextInputField
                      label={translate('url')}
                      placeholder={translate('redirectUrlExample')}
                      value={this.state.options.redirectToUrl.url}
                      onChange={event => this.setOption('redirectToUrl', { url: event.target.value })}
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
                    onChange={event => this.setOption('schedule', { isEnabled: event.target.checked })}
                    marginBottom={16}
                  />
                  <TimeField
                    label={translate('timeFrom')}
                    value={this.state.options.schedule.from}
                    onChange={event => this.setOption('schedule', { from: event.target.value })}
                    disabled={!this.state.options.schedule.isEnabled}
                    marginBottom={16}
                  />
                  <TimeField
                    label={translate('timeTo')}
                    value={this.state.options.schedule.to}
                    onChange={event => this.setOption('schedule', { to: event.target.value })}
                    disabled={!this.state.options.schedule.isEnabled}
                  />
                </Fragment>
              }
              {tab.id === 'blacklist' &&
                <Fragment>
                  <Paragraph size={300} color="muted" marginBottom={16}>{translate('blacklistDescription')}</Paragraph>
                  <WebsiteList
                    list={this.state.options.blacklist}
                    onChange={list => this.setOption({ blacklist: list })}
                  />
                </Fragment>
              }
              {tab.id === 'whitelist' &&
                <Fragment>
                  <Paragraph size={300} color="muted" marginBottom={16}>{translate('whitelistDescription')}</Paragraph>
                  <WebsiteList
                    list={this.state.options.whitelist}
                    onChange={list => this.setOption({ whitelist: list })}
                  />
                </Fragment>
              }
              {tab.id === 'misc' &&
                <Fragment>
                  <SwitchField
                    label={translate('enableOnBrowserStartup')}
                    checked={this.state.options.misc.enableOnBrowserStartup}
                    onChange={event => this.setOption('misc', { enableOnBrowserStartup: event.target.checked })}
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
