import React, { Component } from 'react';
import { Pane, TextInput, UnlockIcon, toaster, HistoryIcon, Position, PlusIcon, TickIcon, PowerIcon } from 'evergreen-ui';
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
    this.showAddWebsitePrompt = false;
    this.isWideScreen = ['/settings', '/logs'].some((route) => this.props.path.startsWith(route));
    debug.log({ hash: this.hash, path: this.props.path });
    this.state = {
      password: '',
      isQuickActivationButtonVisible: false,
      isAddButtonVisible: false,
      enableLogs: false,
    };
  }

  componentDidMount() {
    sendMessage('getLogsSettings').then(logs => this.setState({ enableLogs: (logs || defaultLogsSettings).isEnabled }));
    storage.get({
      mode: this.mode,
      password: {
        hash: this.hash,
        allowActivationWithoutPassword: false,
        allowAddingWebsitesWithoutPassword: false,
      },
      showAddWebsitePrompt: this.showAddWebsitePrompt,
    }).then((items) => {
      if (items) {
        this.mode = items.mode;
        this.hash = items.password.hash;
        this.showAddWebsitePrompt = items.showAddWebsitePrompt;
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
  }

  setQuickActivationButtonVisibility = (value) => {
    this.setState((state) => ({
      ...state,
      isQuickActivationButtonVisible: value,
    }));
  }

  toggleAddButton = async (mode) => {
    const isVisible = await isActiveTabBlockable(mode);
    this.setAddButtonVisibility(isVisible);
  }

  setAddButtonVisibility = (value) => {
    this.setState((state) => ({
      ...state,
      isAddButtonVisible: value,
    }));
  }

  redirectTo = (path, state = null) => {
    debug.log('redirecting to:', path, state);
    this.props.history.location.state = state;
    this.props.history.push(path || '/');//, state); // passing state to history.push() doesn't work with hash router
  }

  checkPassword = () => {
    if (!compare(this.state.password, this.hash)) {
      toaster.danger(translate('passwordIsWrong'), { id: 'pwd-toaster' });
    } else {
      toaster.closeAll();
      if (this.props.onSuccess) {
        this.props.onSuccess();
      } else {
        this.redirectTo(this.props.path, { accessAllowed: true });
      }
    }
  }

  activate = () => {
    return sendMessage('setIsEnabled', true).then(() => true);
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
            </Pane>
            <Pane>
              <AnimatedIconButton
                appearance="minimal"
                tooltip={this.mode === Mode.whitelist ? translate('addToWhitelist') : translate('addToBlacklist')}
                tooltipPosition={Position.LEFT}
                icon={PlusIcon}
                iconSize={22}
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
