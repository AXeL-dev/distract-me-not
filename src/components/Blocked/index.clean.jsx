import React, { Component, Fragment } from 'react';
import { Pane, toaster, DuplicateIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { storage, sendMessage } from 'helpers/webext';
import { debug, isDevEnv } from 'helpers/debug';
import { getValidUrl } from 'helpers/url';
import { isPageReloaded } from 'helpers/block';
import copy from 'copy-to-clipboard';
import './styles.scss';

export class Blocked extends Component {
  constructor(props) {
    super(props);

    this.state = {
      url: '', // Initialize url in state
      reason: '', // Initialize reason state
      message: props.message || translate('defaultBlockingMessage'),
      displayBlockedLink: props.displayBlockedLink !== undefined ? props.displayBlockedLink : true, // Default to showing it
    };
  }

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
      debug.log('[Blocked Page] State after URL parse - URL:', this.state.url, 'Reason:', this.state.reason);
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
        message: translate('defaultBlockingMessage'),
        displayBlockedLink: true,
      })
      .then((items) => {
        if (items) {
          this.setState({
            message: items.message.length ? items.message : translate('defaultBlockingMessage'),
            // Make sure the blocked URL is shown if enabled in settings
            displayBlockedLink: items.displayBlockedLink
          }, () => {
            // Log state after storage items are applied
            debug.log('[Blocked Page] State after storage.get - URL:', this.state.url, 'Reason:', this.state.reason);
          });
        } else {
          debug.log('[Blocked Page] storage.get returned no items. State remains - URL:', this.state.url, 'Reason:', this.state.reason);
        }
      });
  }

  copyBlockedLink = () => {
    if (copy(this.state.url)) {
      toaster.success(translate('copiedToClipboard'), {
        id: 'blocked-toaster',
      });
    }
  };

  render() {
    debug.log('[Blocked Render] Rendering block page with state:', {
      url: this.state.url,
      reason: this.state.reason,
      displayBlockedLink: this.state.displayBlockedLink,
      message: this.state.message
    });
    
    // Always use a default message if none is available
    const blockMessage = this.state.message || translate('defaultBlockingMessage');
    
    return (
      <Fragment>
        {/* Always show the block page with the block message */}
        <div className="distract-cursor distract-select distract-overlay-container">
          <div className="distract-cursor distract-select distract-overlay">
            <div className="distract-cursor distract-select distract-info-container">
              <span className="distract-cursor distract-select distract-overlay-top-text">
                {blockMessage}
              </span>
              {/* Show the blocked link only if enabled in settings */}
              {this.state.displayBlockedLink && (
                <span className="distract-blocked-link">
                  <input type="text" value={this.state.url || ''} readOnly />
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
              {/* No unblock button, no unblock dialog */}
            </div>
          </div>
        </div>
        
        {/* Development mode reason display */}
        {isDevEnv && (
          <div className="reason-container">
            <p className="text-lg text-red-500 font-bold">
              Displaying Reason: {this.state.reason ? this.state.reason : 'No specific reason provided in state.'}
            </p>
          </div>
        )}
      </Fragment>
    );
  }
}

export default Blocked;
