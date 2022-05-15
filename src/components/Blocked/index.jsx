import React, { Component, Fragment } from 'react';
import {
  Pane,
  Dialog,
  RadioGroup,
  Button,
  UnlockIcon,
  toaster,
  DuplicateIcon,
} from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { storage, sendMessage } from 'helpers/webext';
import { debug, isDevEnv, isProdEnv } from 'helpers/debug';
import { isUrl, getValidUrl } from 'helpers/url';
import {
  UnblockOptions,
  isPageReloaded,
  defaultUnblockSettings,
  defaultBlockSettings,
} from 'helpers/block';
import { NumberInput, PasswordPrompt } from 'components';
import queryString from 'query-string';
import copy from 'copy-to-clipboard';
import './styles.scss';

export class Blocked extends Component {
  constructor(props) {
    super(props);
    this.url = props.location ? queryString.parse(props.location.search).url : null;
    if (this.url && isUrl(this.url)) {
      this.url = decodeURIComponent(this.url);
      this.url = getValidUrl(this.url);
    }
    if (isDevEnv && !this.url) {
      this.url = 'https://www.example.com';
    }
    debug.log('url', this.url);
    const defaultUnblockTime = 10; // min
    this.state = {
      message: props.message || translate('defaultBlockingMessage'),
      isBlank: props.isBlank === undefined ? isProdEnv : props.isBlank, // isBlank should be true by default in prod
      hasUnblockButton: props.hasUnblockButton || isDevEnv,
      displayBlockedLink:
        props.displayBlockedLink || isDevEnv || defaultBlockSettings.displayBlockedLink,
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
        value: UnblockOptions.unblockOnce,
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
              onChange={(value) =>
                this.updateUnblockDialogState({
                  selected: UnblockOptions.unblockForWhile,
                  time: value,
                })
              }
            />
            <span>{translate('minutes')}</span>
          </Pane>
        ),
        value: UnblockOptions.unblockForWhile,
      },
    ];
  };

  componentDidMount() {
    if (isPageReloaded()) {
      debug.log('page reloaded!');
      sendMessage('isUrlStillBlocked', this.url).then((isUrlStillBlocked) => {
        // Redirect to blocked url if no longer blocked
        if (isUrlStillBlocked === false && this.url) {
          sendMessage('redirectSenderTab', this.url);
          return;
        }
      });
    }
    storage
      .get({
        message: this.state.message,
        displayBlankPage: this.state.isBlank,
        displayBlockedLink: this.state.displayBlockedLink,
        unblock: {
          isEnabled: isDevEnv || defaultUnblockSettings.isEnabled,
          requirePassword: defaultUnblockSettings.requirePassword,
        },
        password: {
          isEnabled: false,
        },
      })
      .then((items) => {
        if (items) {
          this.setState({
            message: items.message.length ? items.message : this.state.message,
            isBlank: items.displayBlankPage,
            displayBlockedLink: items.displayBlockedLink,
            hasUnblockButton: items.unblock.isEnabled,
            unblockDialog: {
              ...this.state.unblockDialog,
              requirePassword:
                items.unblock.isEnabled &&
                items.unblock.requirePassword &&
                items.password.isEnabled,
            },
          });
        }
      });
  }

  updateUnblockDialogState = (state) => {
    this.setState({
      unblockDialog: {
        ...this.state.unblockDialog,
        ...state,
      },
    });
  };

  closeUnblockDialog = () => {
    this.updateUnblockDialogState({ isShown: false });
  };

  openUnblockDialog = () => {
    this.updateUnblockDialogState({ isShown: true });
  };

  unblock = () => {
    this.closeUnblockDialog();
    const params = {
      url: this.url,
      option: this.state.unblockDialog.selected,
      time: this.state.unblockDialog.time,
    };
    debug.log('unblocking:', params);
    if (this.url) {
      //window.location.replace(this.url);
      sendMessage('unblockSenderTab', params);
    }
  };

  copyBlockedLink = () => {
    if (copy(this.url)) {
      toaster.success(translate('copiedToClipboard'), {
        id: 'blocked-toaster',
      });
    }
  };

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
                  {this.state.displayBlockedLink && (
                    <span className="distract-blocked-link">
                      <input type="text" value={this.url || ''} readOnly />
                      <button
                        className="copy"
                        title={translate('copy')}
                        onClick={this.copyBlockedLink}
                      >
                        <DuplicateIcon />
                      </button>
                    </span>
                  )}
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
                className: 'unblock-dialog',
              }}
            >
              <Pane width="95%" margin="auto">
                <RadioGroup
                  size={16}
                  value={this.state.unblockDialog.selected}
                  options={this.state.unblockDialog.options}
                  onChange={(event) =>
                    this.updateUnblockDialogState({
                      selected: event.target.value,
                    })
                  }
                />
                {this.state.unblockDialog.requirePassword ? (
                  <PasswordPrompt
                    hasHeader={false}
                    hasFooter={false}
                    minWidth="auto"
                    minHeight={50}
                    inputWidth="100%"
                    maxInputWidth="auto"
                    onSuccess={this.unblock}
                  />
                ) : (
                  <Pane
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    marginTop={20}
                  >
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
