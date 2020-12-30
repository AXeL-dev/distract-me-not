import { Component, Fragment } from 'react';
import { Pane, Tablist, Tab, SelectField, TextInputField, Button, TickIcon } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import SwitchField from '../shared/switch-field/SwitchField';
import './Settings.scss';

export default class Settings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedTabIndex: 0,
      tabs: [
        translate('options') || 'Options',
        translate('settings_blacklist_title') || 'Blacklist',
        translate('settings_whitelist_title') || 'Whitelist'
      ],
      options: {
        enableOnBrowserStartup: false,
        action: 'blockTab',
        blockTab: {
          errorMessage: '',
          disableKeyboard: false
        },
        redirectToUrl: {
          url: ''
        },
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
  setOption(...params) {
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

  render() {
    return (
      <Fragment>
        <Pane padding={16}>
          <Tablist marginBottom={16}>
            {this.state.tabs.map((tab, index) => (
              <Tab
                key={tab}
                id={tab}
                onSelect={() => this.setState({ selectedTabIndex: index })}
                isSelected={index === this.state.selectedTabIndex}
                aria-controls={`panel-${tab}`}
                fontSize={14}
              >
                {tab}
              </Tab>
            ))}
          </Tablist>
          <Pane padding={16} background="tint1" border="muted" flex="1">
            {this.state.tabs.map((tab, index) => (
              <Pane
                key={tab}
                id={`panel-${tab}`}
                role="tabpanel"
                aria-labelledby={tab}
                aria-hidden={index !== this.state.selectedTabIndex}
                display={index === this.state.selectedTabIndex ? 'block' : 'none'}
                //maxWidth={500}
              >
                {index === 0 &&
                  <Fragment>
                    <SwitchField
                      label={translate('enable_on_browser_startup') || 'Enable on browser startup'}
                      checked={this.state.options.enableOnBrowserStartup}
                      onChange={event => this.setOption({ enableOnBrowserStartup: event.target.checked })}
                      marginBottom={16}
                    />
                    <SelectField
                      label={translate('default_action') || 'Default action'}
                      hint={translate('action_to_take') || 'Choose an action to take for the blacklisted / whitelisted websites'}
                      value={this.state.options.action}
                      onChange={event => this.setOption({ action: event.target.value })}
                      marginBottom={16}
                    >
                      <option value="blockTab">{translate('display_error_message') || 'Display an error message'}</option>
                      <option value="redirectToUrl">{translate('redirect_to_url') || 'Redirect to url'}</option>
                      <option value="closeTab">{translate('close_tab') || 'Close tab'}</option>
                    </SelectField>
                    {this.state.options.action === 'blockTab' &&
                      <Fragment>
                        <TextInputField
                          label={translate('error_message') || 'Error message'}
                          placeholder={translate('overlay_message') || 'Where are you going...'}
                          value={this.state.options.blockTab.errorMessage}
                          onChange={event => this.setOption('blockTab', { errorMessage: event.target.value })}
                        />
                        <SwitchField
                          label={translate('disable_keyboard_when_error_message_is_displayed') || 'Disable keyboard when error message is displayed'}
                          checked={this.state.options.blockTab.disableKeyboard}
                          onChange={event => this.setOption('blockTab', { disableKeyboard: event.target.checked })}
                          marginBottom={16}
                        />
                      </Fragment>
                    }
                    {this.state.options.action === 'redirectToUrl' &&
                      <TextInputField
                        label={translate('url') || 'Url'}
                        placeholder={translate('redirect_to_url_example') || 'url'}
                        value={this.state.options.redirectToUrl.url}
                        onChange={event => this.setOption('redirectToUrl', { url: event.target.value })}
                      />
                    }
                  </Fragment>
                }
                {index === 1 &&
                  <Fragment>

                  </Fragment>
                }
                {index === 2 &&
                  <Fragment>

                  </Fragment>
                }
              </Pane>
            ))}
          </Pane>
        </Pane>
        <Pane display="flex" alignItems="center" justifyContent="center">
          <Button
            height={32}
            appearance="primary"
            iconBefore={TickIcon}
          >
            Save
          </Button>
        </Pane>
      </Fragment>
    );
  }
}
