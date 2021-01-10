import { Component } from 'react';
import { Pane, TextInput, UnlockIcon, toaster } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { storage, isChrome } from '../../helpers/webext';
import { compare } from '../../helpers/crypt';
import { debug } from '../../helpers/debug';
import Header from '../shared/header/Header';
import IconButton from '../shared/icon-button/IconButton';
import SettingsButton from '../shared/settings-button/SettingsButton';

const defaultHash = process.env.REACT_APP_HASH;

export default class PasswordPrompt extends Component {

  constructor(props) {
    super(props);
    this.hash = defaultHash || null;
    this.redirectPath = this.props.path || '/';
    debug.log({
      hash: this.hash,
      redirectPath: this.redirectPath
    });
    this.state = {
      password: '',
      hasHeader: this.hasHeader(),
      hasFooter: this.hasFooter()
    };
  }

  hasHeader = () => {
    return this.props.hasHeader !== undefined ? this.props.hasHeader : !isChrome() || this.redirectPath !== '/settings';
  }

  hasFooter = () => {
    return this.props.hasFooter !== undefined ? this.props.hasFooter : this.redirectPath !== '/settings';
  }

  componentDidMount() {
    storage.get({
      password: {
        hash: this.hash
      }
    }).then((items) => {
      if (items) {
        this.hash = items.password.hash;
      }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    //debug.log({ props: this.props, prevProps: prevProps, state: this.state, prevState: prevState });
    if (this.props.path !== prevProps.path && this.props.path !== this.state.path) {
      debug.warn('path prop has changed:', this.props.path);
      this.redirectPath = this.props.path;
      this.setState({
        hasHeader: this.hasHeader(),
        hasFooter: this.hasFooter()
      });
    }
  }

  redirectTo = (path, state = null) => {
    debug.log('redirecting to:', path, state);
    this.props.history.location.state = state;
    this.props.history.push(path);//, state); // passing state to history.push() doesn't work with hash router
  }

  getRedirectPath = () => {
    return 
  }

  unlock = () => {
    if (!compare(this.state.password, this.hash)) {
      toaster.danger(translate('passwordIsWrong'), { id: 'pwd-toaster' });
    } else {
      toaster.closeAll();
      if (this.props.onSuccess) {
        this.props.onSuccess();
      } else {
        this.redirectTo(this.redirectPath, { pass: true });
      }
    }
  }

  handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      this.unlock();
    }
  }

  handleButtonClick = (event) => {
    this.unlock();
  }

  getMinWidth = () => {
    return this.props.minWidth || (this.redirectPath === '/settings' ? 580 : 320);
  }

  getMinHeight = () => {
    return this.props.minHeight || (this.redirectPath === '/settings' ? 380 : 230);
  }

  getInputWidth = () => {
    return this.props.inputWidth || (this.redirectPath === '/settings' ? 320 : '70%');
  }

  getInputHeight = () => {
    return this.props.inputHeight || (this.redirectPath === '/settings' ? 36 : 32);
  }

  getButtonWidth = () => {
    return this.props.buttonWidth || this.props.inputHeight || (this.redirectPath === '/settings' ? 36 : 32);
  }

  getButtonHeight = () => {
    return this.props.buttonHeight || this.props.inputHeight || (this.redirectPath === '/settings' ? 36 : 32);
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
        {this.state.hasHeader && (
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
                onKeyPress={this.handleKeyPress}
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
        {this.state.hasFooter && (
          <Pane display="flex" paddingX={16} paddingY={10} alignItems="start" justifyContent="space-between" borderTop>
            <SettingsButton history={this.props.history} />
          </Pane>
        )}
      </Pane>
    );
  }

}