import React, { Component } from 'react';
import {
  Pane,
  TextInput,
  UnlockIcon,
  toaster,
  HistoryIcon,
  Position,
  PlusIcon,
  TickIcon,
  PowerIcon,
  StopwatchIcon,
} from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { storage, sendMessage } from 'helpers/webext';
import { compare } from 'helpers/crypt';
import { debug } from 'helpers/debug';
import { defaultLogsSettings } from 'helpers/logger';
import { defaultTimerSettings } from 'helpers/timer';
import {
  Header,
  IconButton,
  SettingsButton,
  LinkIconButton,
  AnimatedIconButton,
} from 'components';
import {
  defaultMode,
  Mode,
  addCurrentWebsite,
  isActiveTabBlockable,
} from 'helpers/block';
import { isSmallDevice } from 'helpers/device';
import { isUrl, getValidUrl, generateToken } from 'helpers/url';
import { GithubIcon } from 'icons';
import queryString from 'query-string';

const defaultHash = process.env.REACT_APP_HASH;

export class PasswordPrompt extends Component {
  constructor(props) {
    super(props);
    this.redirect = props.location
      ? queryString.parse(props.location.search).redirect
      : null;
    if (this.redirect && isUrl(this.redirect)) {
      this.redirect = decodeURIComponent(this.redirect);
      this.redirect = getValidUrl(this.redirect);
    }
    this.mode = defaultMode;
    this.hash = defaultHash || null;
    this.hasHeader = this.getProp('hasHeader');
    this.hasFooter = this.getProp('hasFooter');
    this.isSmallScreen = isSmallDevice();
    debug.log({ redirect: this.redirect, hash: this.hash, props });
    this.state = {
      password: '',
      enableLogs: false,
      enableTimer: false,
      isAddButtonVisible: false,
      isQuickActivationButtonVisible: false,
      hideReportIssueButton: false,
      showAddWebsitePrompt: false,
    };
  }

  getProp(prop) {
    return this.props[prop] || this.getLocationStateProp(prop);
  }

  getLocationStateProp(prop) {
    return this.props.location && this.props.location.state
      ? this.props.location.state[prop]
      : undefined;
  }

  getRedirectPath(defaultValue = '/') {
    return this.getProp('path') || defaultValue;
  }

  getQueryParams(defaultValue = '') {
    return this.getLocationStateProp('search') || defaultValue;
  }

  componentDidMount() {
    sendMessage('getLogsSettings').then((logs) =>
      this.setState({
        enableLogs: (logs || defaultLogsSettings).isEnabled,
      })
    );
    sendMessage('getTimerSettings').then((timer) => {
      const settings = timer || defaultTimerSettings;
      this.setState({
        enableTimer: settings.isEnabled && settings.allowUsingTimerWithoutPassword,
      });
    });
    storage
      .get({
        mode: this.mode,
        password: {
          hash: this.hash,
          allowActivationWithoutPassword: false,
          allowAddingWebsitesWithoutPassword: false,
        },
        hideReportIssueButton: this.state.hideReportIssueButton,
        showAddWebsitePrompt: this.state.showAddWebsitePrompt,
      })
      .then((items) => {
        if (items) {
          this.mode = items.mode;
          this.hash = items.password.hash;
          this.setState({
            hideReportIssueButton: items.hideReportIssueButton,
            showAddWebsitePrompt: items.showAddWebsitePrompt,
          });
          if (items.password.allowActivationWithoutPassword) {
            this.toggleQuickActivationButton();
          }
          if (items.password.allowAddingWebsitesWithoutPassword) {
            this.toggleAddButton(this.mode);
          }
        }
      });
  }

  toggleQuickActivationButton = async () => {
    const isEnabled = await sendMessage('getIsEnabled');
    this.setQuickActivationButtonVisibility(!isEnabled);
  };

  setQuickActivationButtonVisibility = (value) => {
    this.setState((state) => ({
      ...state,
      isQuickActivationButtonVisible: value,
    }));
  };

  toggleAddButton = async (mode) => {
    const isVisible = await isActiveTabBlockable(mode);
    this.setAddButtonVisibility(isVisible);
  };

  setAddButtonVisibility = (value) => {
    this.setState((state) => ({
      ...state,
      isAddButtonVisible: value,
    }));
  };

  checkPassword = () => {
    if (!compare(this.state.password, this.hash)) {
      toaster.danger(translate('passwordIsWrong'), {
        id: 'pwd-toaster',
      });
    } else {
      toaster.closeAll();
      if (this.props.onSuccess) {
        this.props.onSuccess();
      } else if (this.redirect) {
        sendMessage('allowAccessWithToken', {
          url: this.redirect,
          token: generateToken(),
        });
      } else {
        const pathname = this.getRedirectPath();
        const search = this.getQueryParams();
        debug.log(`redirecting to: ${[pathname, search].join()}`);
        this.props.history.push({
          pathname,
          search,
          state: { accessAllowed: true },
        });
      }
    }
  };

  activate = () => {
    return sendMessage('setIsEnabled', true).then(() => true);
  };

  handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      this.checkPassword();
    }
  };

  handleButtonClick = (event) => {
    this.checkPassword();
  };

  render() {
    return (
      <Pane
        display="flex"
        flexDirection="column"
        width="100%"
        height="100%"
        minWidth={this.props.minWidth || 350}
        minHeight={this.props.minHeight || 230}
      >
        {this.hasHeader && <Header />}
        <Pane
          display="flex"
          flex={1}
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
        >
          <Pane
            display="flex"
            width={this.props.inputWidth || '70%'}
            maxWidth={this.props.maxInputWidth || 320}
          >
            <Pane display="flex" alignItems="center" flex={1}>
              <TextInput
                width="100%"
                height={this.isSmallScreen ? 32 : 36}
                type="password"
                value={this.state.password}
                onChange={(event) => this.setState({ password: event.target.value })}
                onKeyDown={this.handleKeyDown}
                placeholder={translate('password')}
                borderTopRightRadius={0}
                borderBottomRightRadius={0}
                autoFocus
              />
            </Pane>
            <Pane display="flex" alignItems="center" marginLeft={-1}>
              <IconButton
                appearance="primary"
                icon={UnlockIcon}
                iconSize={14}
                borderTopLeftRadius={0}
                borderBottomLeftRadius={0}
                onClick={this.handleButtonClick}
                width={this.isSmallScreen ? 32 : 36}
                height={this.isSmallScreen ? 32 : 36}
              />
            </Pane>
          </Pane>
        </Pane>
        {this.hasFooter && (
          <Pane
            display="flex"
            paddingX={16}
            paddingY={10}
            alignItems="start"
            justifyContent="space-between"
            borderTop
          >
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
              <AnimatedIconButton
                appearance="minimal"
                tooltip={translate('quickActivation')}
                tooltipPosition={Position.RIGHT}
                icon={PowerIcon}
                iconColor="#4E4E50"
                onClick={this.activate}
                hideOnClick={true}
                hideAnimationIcon={TickIcon}
                hideAnimationIconColor="#47b881"
                isVisible={this.state.isQuickActivationButtonVisible}
                onVisibilityChange={this.setQuickActivationButtonVisibility}
              />
              {this.state.enableTimer && (
                <LinkIconButton
                  icon={StopwatchIcon}
                  link="/timer"
                  sameTab
                  state={{ accessAllowed: true }}
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
                  this.mode === Mode.whitelist
                    ? translate('addToWhitelist')
                    : translate('addToBlacklist')
                }
                tooltipPosition={Position.LEFT}
                icon={PlusIcon}
                iconSize={22}
                iconColor="#47b881"
                onClick={() =>
                  addCurrentWebsite(this.mode, this.state.showAddWebsitePrompt)
                }
                hideOnClick={true}
                hideAnimationIcon={TickIcon}
                isVisible={this.state.isAddButtonVisible}
                onVisibilityChange={this.setAddButtonVisibility}
              />
            </Pane>
          </Pane>
        )}
      </Pane>
    );
  }
}
