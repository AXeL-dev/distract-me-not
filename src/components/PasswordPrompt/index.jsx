import React, { Component } from 'react';
import { Pane, TextInput, UnlockIcon, toaster, HistoryIcon, Position, PlusIcon, TickIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { storage, sendMessage } from 'helpers/webext';
import { compare } from 'helpers/crypt';
import { debug } from 'helpers/debug';
import { defaultLogsSettings } from 'helpers/logger';
import { Header, IconButton, SettingsButton, LinkIconButton, AnimatedIconButton } from 'components';
import { defaultMode, Mode, addCurrentWebsite, isActiveTabBlockable } from 'helpers/block';

const defaultHash = process.env.REACT_APP_HASH;

export class PasswordPrompt extends Component {

  constructor(props) {
    super(props);
    this.mode = defaultMode;
    this.hash = defaultHash || null;
    this.redirectPath = this.getRedirectPath();
    this.showAddWebsitePrompt = false;
    this.isWideScreen = ['/settings', '/logs'].includes(this.props.path);
    debug.log({ hash: this.hash, redirectPath: this.redirectPath });
    this.state = {
      password: '',
      isAddButtonVisible: false,
      enableLogs: false,
    };
  }

  getRedirectPath() {
    if (this.props.path) {
      const regex = new RegExp(`^#${this.props.path}`);
      const search = window.location.hash.replace(regex, '');
      return `${this.props.path}${search}`;
    } else {
      return '/';
    }
  }

  componentDidMount() {
    sendMessage('getLogsSettings').then(logs => this.setState({ enableLogs: (logs || defaultLogsSettings).isEnabled }));
    storage.get({
      mode: this.mode,
      password: {
        hash: this.hash,
        allowAddingWebsitesWithoutPassword: false,
      },
      showAddWebsitePrompt: this.showAddWebsitePrompt,
    }).then((items) => {
      if (items) {
        this.mode = items.mode;
        this.hash = items.password.hash;
        this.showAddWebsitePrompt = items.showAddWebsitePrompt;
        if (items.password.allowAddingWebsitesWithoutPassword) {
          this.toggleAddButton(this.mode);
        }
      }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    //debug.log({ props: this.props, prevProps: prevProps, state: this.state, prevState: prevState });
    if (this.props.path !== prevProps.path && this.props.path !== this.state.path) {
      debug.warn('path prop has changed:', this.props.path);
      this.redirectPath = this.props.path;
    }
  }

  toggleAddButton = async (mode) => {
    const isVisible = await isActiveTabBlockable(mode);
    this.setAddButtonVisibility(isVisible);
  }

  setAddButtonVisibility = (value) => {
    this.setState({ isAddButtonVisible: value });
  }

  redirectTo = (path, state = null) => {
    debug.log('redirecting to:', path, state);
    this.props.history.location.state = state;
    this.props.history.push(path);//, state); // passing state to history.push() doesn't work with hash router
  }

  checkPassword = () => {
    if (!compare(this.state.password, this.hash)) {
      toaster.danger(translate('passwordIsWrong'), { id: 'pwd-toaster' });
    } else {
      toaster.closeAll();
      if (this.props.onSuccess) {
        this.props.onSuccess();
      } else {
        this.redirectTo(this.redirectPath, { accessAllowed: true });
      }
    }
  }

  handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      this.checkPassword();
    }
  }

  handleButtonClick = (event) => {
    this.checkPassword();
  }

  getMinWidth = () => {
    return this.props.minWidth || (this.isWideScreen ? 580 : 350);
  }

  getMinHeight = () => {
    return this.props.minHeight || (this.isWideScreen ? 380 : 230);
  }

  getInputWidth = () => {
    return this.props.inputWidth || (this.isWideScreen ? 320 : '70%');
  }

  getInputHeight = () => {
    return this.props.inputHeight || (this.isWideScreen ? 36 : 32);
  }

  getButtonWidth = () => {
    return this.props.buttonWidth || this.props.inputHeight || (this.isWideScreen ? 36 : 32);
  }

  getButtonHeight = () => {
    return this.props.buttonHeight || this.props.inputHeight || (this.isWideScreen ? 36 : 32);
  }

  render() {
    return (
      <Pane
        display="flex"
        flexDirection="column"
        width="100%"
        height="100%"
        minWidth={this.getMinWidth()}
        minHeight={this.getMinHeight()}
      >
        {this.props.hasHeader && (
          <Header />
        )}
        <Pane
          display="flex"
          flex={1}
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
        >
          <Pane display="flex" width={this.getInputWidth()}>
            <Pane display="flex" alignItems="center" flex={1}>
              <TextInput
                width="100%"
                height={this.getInputHeight()}
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
                width={this.getButtonWidth()}
                height={this.getButtonHeight()}
              />
            </Pane>
          </Pane>
        </Pane>
        {this.props.hasFooter && (
          <Pane display="flex" paddingX={16} paddingY={10} alignItems="start" justifyContent="space-between" borderTop>
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
            </Pane>
            <Pane>
              <AnimatedIconButton
                appearance="minimal"
                tooltip={this.mode === Mode.whitelist ? translate('addToWhitelist') : translate('addToBlacklist')}
                tooltipPosition={Position.LEFT}
                className="fill-green"
                icon={PlusIcon}
                iconSize={26}
                iconColor="#47b881"
                onClick={() => addCurrentWebsite(this.mode, this.showAddWebsitePrompt)}
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
