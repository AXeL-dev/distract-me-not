import { Component, Fragment } from 'react';
import { Dialog } from 'evergreen-ui';
import { translate } from '../../helpers/i18n';
import { storage, sendMessage } from '../../helpers/webext';
import { debug } from '../../helpers/debug';
import { isUrl, getValidUrl } from '../../helpers/url';
import PasswordPrompt from '../password-prompt/PasswordPrompt';
import queryString from 'query-string';
import './Blocked.scss';

export default class Blocked extends Component {

  constructor(props) {
    super(props);
    this.url = props.location ? queryString.parse(props.location.search).url : null;
    if (this.url && isUrl(this.url)) {
      this.url = decodeURIComponent(this.url);
      this.url = getValidUrl(this.url);
    }
    debug.log('url', this.url);
    this.state = {
      message: props.message || translate('defaultBlockingMessage'),
      isBlank: props.isBlank || false,
      hasUnblockButton: props.hasUnblockButton || false,
      unblockDialog: {
        isShown: false
      }
    };
  }

  componentDidMount() {
    storage.get({
      message: this.state.message,
      displayBlankPage: this.state.isBlank,
      password: {
        isEnabled: false,
        unblockPages: false
      }
    }).then((items) => {
      if (items) {
        this.setState({
          message: items.message.length ? items.message : this.state.message,
          isBlank: items.displayBlankPage,
          hasUnblockButton: items.password.isEnabled && items.password.unblockPages
        });
      }
    });
  }

  toggleUnblockDialog = (value) => {
    this.setState({
      unblockDialog: {
        ...this.state.unblockDialog,
        isShown: value
      }
    });
  }

  closeUnblockDialog = () => {
    this.toggleUnblockDialog(false);
  }

  openUnblockDialog = () => {
    this.toggleUnblockDialog(true);
  }

  redirectToUrl = () => {
    this.closeUnblockDialog();
    if (this.url) {
      //window.location.replace(this.url);
      sendMessage('redirectSenderTab', this.url);
    }
  }

  render() {
    return (
      <Fragment>
        {!this.state.isBlank && (
          <Fragment>
            <div className="distract-cursor distract-select distract-overlay-container">
              <div className="distract-cursor distract-select distract-overlay">
                <div className="distract-cursor distract-select distract-info-container">
                  <span className="distract-cursor distract-select distract-overlay-top-text">
                    {this.state.message}
                  </span>
                  <div className="distract-cursor distract-select distract-overlay-img"></div>
                  {this.state.hasUnblockButton && (
                    <button className="unblock" onClick={this.openUnblockDialog}>
                      {translate('unblock')}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Dialog
              isShown={this.state.unblockDialog.isShown}
              onCloseComplete={this.closeUnblockDialog}
              //shouldCloseOnOverlayClick={false}
              hasHeader={false}
              hasFooter={false}
              topOffset="40vmin"
              width={400}
            >
              <PasswordPrompt
                hasHeader={false}
                hasFooter={false}
                minWidth="auto"
                minHeight={50}
                inputWidth="90%"
                onSuccess={this.redirectToUrl}
              />
            </Dialog>
          </Fragment>
        )}
      </Fragment>
    );
  }
}
