import React, { Component, Fragment } from 'react';
import { Pane, Dialog, RadioGroup, Button, UnlockIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { storage, sendMessage } from 'helpers/webext';
import { debug, isDevEnv } from 'helpers/debug';
import { isUrl, getValidUrl } from 'helpers/url';
import { UnblockOptions, isPageReloaded, defaultUnblock } from 'helpers/block';
import { NumberInput, PasswordPrompt } from 'components';
import queryString from 'query-string';
import './styles.scss';

export class Blocked extends Component {

  constructor(props) {
    super(props);
    this.url = props.location ? queryString.parse(props.location.search).url : null;
    if (this.url && isUrl(this.url)) {
      this.url = decodeURIComponent(this.url);
      this.url = getValidUrl(this.url);
    }
    debug.log('url', this.url);
    const defaultUnblockTime = 10; // min
    this.state = {
      message: props.message || translate('defaultBlockingMessage'),
      isBlank: props.isBlank === undefined ? (isDevEnv ? false : true) : props.isBlank,
      hasUnblockButton: props.hasUnblockButton || isDevEnv, // == isDevEnv ? true : false
      unblockDialog: {
        isShown: false,
        options: this.getUnblockOptions(defaultUnblockTime),
        selected: UnblockOptions.unblockOnce,
        time: defaultUnblockTime,
        requirePassword: props.requirePassword || false,
      },
    };
  }

  getUnblockOptions = (time) => {
    return [
      {
        label: translate('unblockOnce'),
        value: UnblockOptions.unblockOnce
      },
      {
        label: (
          <Pane display="flex" alignItems="center" gap={10}>
            <span>{translate('unblockFor')}</span>
            <NumberInput
              min={1}
              max={720}
              width={65}
              value={time}
              onChange={(value) => this.updateUnblockDialogState({ selected: UnblockOptions.unblockForWhile, time: value })}
            />
            <span>{translate('minutes')}</span>
          </Pane>
        ),
        value: UnblockOptions.unblockForWhile
      }
    ];
  }

  componentDidMount() {
    if (isPageReloaded()) {
      debug.log('page reloaded!');
      sendMessage('isUrlStillBlocked', this.url).then(isUrlStillBlocked => {
        // Redirect to blocked url if no longer blocked
        if (isUrlStillBlocked === false && this.url) {
          sendMessage('redirectSenderTab', this.url);
          return;
        }
      });
    }
    storage.get({
      message: this.state.message,
      displayBlankPage: false,
      unblock: {
        isEnabled: defaultUnblock.isEnabled,
        requirePassword: defaultUnblock.requirePassword,
      },
      password: {
        isEnabled: false,
      },
    }).then((items) => {
      if (items) {
        this.setState({
          message: items.message.length ? items.message : this.state.message,
          isBlank: items.displayBlankPage,
          hasUnblockButton: items.unblock.isEnabled,
          unblockDialog: {
            ...this.state.unblockDialog,
            requirePassword: items.unblock.isEnabled && items.unblock.requirePassword && items.password.isEnabled,
          },
        });
      }
    });
  }

  updateUnblockDialogState = (state) => {
    this.setState({
      unblockDialog: {
        ...this.state.unblockDialog,
        ...state
      }
    });
  }

  closeUnblockDialog = () => {
    this.updateUnblockDialogState({ isShown: false });
  }

  openUnblockDialog = () => {
    this.updateUnblockDialogState({ isShown: true });
  }

  unblock = () => {
    this.closeUnblockDialog();
    const params = {
      url: this.url,
      option: this.state.unblockDialog.selected,
      time: this.state.unblockDialog.time
    };
    debug.log('unblocking:', params);
    if (this.url) {
      //window.location.replace(this.url);
      sendMessage('unblockSenderTab', params);
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
              shouldCloseOnOverlayClick={false}
              //hasHeader={false}
              hasFooter={false}
              topOffset="40vmin"
              width={400}
              containerProps={{
                className: "unblock-dialog"
              }}
            >
              <Pane width="95%" margin="auto">
                <RadioGroup
                  size={16}
                  value={this.state.unblockDialog.selected}
                  options={this.state.unblockDialog.options}
                  onChange={event => this.updateUnblockDialogState({ selected: event.target.value })}
                />
                {this.state.unblockDialog.requirePassword ? (
                  <PasswordPrompt
                    hasHeader={false}
                    hasFooter={false}
                    minWidth="auto"
                    minHeight={50}
                    inputWidth="100%"
                    inputHeight={36}
                    onSuccess={this.unblock}
                  />
                ) : (
                  <Pane display="flex" alignItems="center" justifyContent="center" marginTop={20}>
                    <Button
                      height={32}
                      appearance="primary"
                      iconBefore={UnlockIcon}
                      onClick={this.unblock}
                    >
                      {translate('unblock')}
                    </Button>
                  </Pane>
                )}
              </Pane>
            </Dialog>
          </Fragment>
        )}
      </Fragment>
    );
  }
}
