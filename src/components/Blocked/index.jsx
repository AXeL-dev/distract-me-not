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

    const defaultUnblockTime = 10; // min
    this.state = {
      url: '', // Initialize url in state
      reason: '', // Initialize reason state
      message: props.message || translate('defaultBlockingMessage'),
      isBlank: props.isBlank === undefined ? isProdEnv : props.isBlank,
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
    const hash = window.location.hash;
    const queryStringInHash = hash.substring(hash.indexOf('?') + 1);
    const params = new URLSearchParams(queryStringInHash);

    let parsedUrl = params.get('url');
    let parsedReason = params.get('reason');

    let finalUrl = '';
    if (parsedUrl) {
      finalUrl = decodeURIComponent(parsedUrl);
      finalUrl = getValidUrl(finalUrl);
    }

    if (isDevEnv && !finalUrl) {
      finalUrl = 'https://www.example.com'; // Dev fallback
    }
    
    const finalReason = parsedReason ? decodeURIComponent(parsedReason) : 'REASON_NOT_IN_URL_PARAMS'; // Default if not found
    debug.log('[Blocked Page] Initial Parsed - URL:', finalUrl, 'Reason:', finalReason);

    this.setState({ 
      url: finalUrl, 
      reason: finalReason 
    }, () => {
      // Log state after URL params are set
      debug.log('[Blocked Page] State after URL parse - URL:', this.state.url, 'Reason:', this.state.reason, 'IsBlank:', this.state.isBlank);
    });

    if (isPageReloaded()) {
      debug.log('page reloaded!');
      if (finalUrl) { // Use the parsed finalUrl
        sendMessage('isUrlStillBlocked', finalUrl).then((isUrlStillBlocked) => {
          if (isUrlStillBlocked === false) {
            sendMessage('redirectSenderTab', finalUrl);
            // No return needed here
          }
        });
      }
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
          this.setState((prevState) => ({
            message: items.message.length ? items.message : prevState.message,
            isBlank: items.displayBlankPage, // This could be overriding isBlank
            displayBlockedLink: items.displayBlockedLink,
            hasUnblockButton: items.unblock.isEnabled,
            unblockDialog: {
              ...prevState.unblockDialog,
              requirePassword:
                items.unblock.isEnabled &&
                items.unblock.requirePassword &&
                items.password.isEnabled,
            },
          }), () => {
            // Log state after storage items are applied
            debug.log('[Blocked Page] State after storage.get - URL:', this.state.url, 'Reason:', this.state.reason, 'IsBlank:', this.state.isBlank);
          });
        } else {
          debug.log('[Blocked Page] storage.get returned no items. State remains - URL:', this.state.url, 'Reason:', this.state.reason, 'IsBlank:', this.state.isBlank);
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
      url: this.state.url, // Use state.url
      option: this.state.unblockDialog.selected,
      time: this.state.unblockDialog.time,
    };
    debug.log('unblocking:', params);
    if (this.state.url) { // Use state.url
      sendMessage('unblockSenderTab', params);
    }
  };

  copyBlockedLink = () => {
    if (copy(this.state.url)) { // Use state.url
      toaster.success(translate('copiedToClipboard'), {
        id: 'blocked-toaster',
      });
    }
  };

  render() {
    return (
      <Fragment>
        {/* For debugging, let's add a direct display of state.reason and state.isBlank outside the main conditional */}
        <div style={{ position: 'absolute', top: '0', left: '0', backgroundColor: 'yellow', padding: '10px', zIndex: '9999' }}>
          <p>DEBUG: Reason from state: "{this.state.reason}"</p>
          <p>DEBUG: isBlank from state: {this.state.isBlank ? 'true' : 'false'}</p>
        </div>

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
                      <input type="text" value={this.state.url || ''} readOnly /> {/* Use state.url */}
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
                // Handle ENTER keypress and close dialog
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    this.unblock();
                  }
                }
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
            <div className="reason-container">
              <p className="text-lg text-red-500 font-bold">
                Displaying Reason: {this.state.reason ? this.state.reason : 'No specific reason provided in state.'}
              </p>
            </div>
          </Fragment>
        )}
      </Fragment>
    );
  }
}
