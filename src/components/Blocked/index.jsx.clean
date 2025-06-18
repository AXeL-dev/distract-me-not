import React, { Component, Fragment } from 'react';
import { toaster, DuplicateIcon } from 'evergreen-ui';
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
      message: translate('defaultBlockingMessage'),
      displayBlockedLink: true,
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
    
    const finalReason = parsedReason ? decodeURIComponent(parsedReason) : 'REASON_NOT_IN_URL_PARAMS';
    debug.log('[Blocked Page] Initial Parsed - URL:', finalUrl, 'Reason:', finalReason);

    this.setState({ 
      url: finalUrl, 
      reason: finalReason 
    });

    if (isPageReloaded()) {
      debug.log('page reloaded!');
      if (finalUrl) {
        sendMessage('isUrlStillBlocked', finalUrl).then((isUrlStillBlocked) => {
          if (isUrlStillBlocked === false) {
            sendMessage('redirectSenderTab', finalUrl);
          }
        });
      }
    }
    
    // Retrieve stored settings
    storage.get({
      message: translate('defaultBlockingMessage'),
      displayBlockedLink: true,
    }).then((items) => {
      if (items) {
        this.setState({
          message: items.message.length ? items.message : translate('defaultBlockingMessage'),
          displayBlockedLink: items.displayBlockedLink !== false,
        }, () => {
          debug.log('[Blocked Page] State after storage.get:', this.state);
        });
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
        {/* Always show the black page with the block message */}
        <div className="distract-cursor distract-select distract-overlay-container">
          <div className="distract-cursor distract-select distract-overlay">
            <div className="distract-cursor distract-select distract-info-container">
              <span className="distract-cursor distract-select distract-overlay-top-text">
                {blockMessage}
              </span>
              
              {/* Show the blocked link if enabled */}
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
              {/* No unblock button */}
            </div>
          </div>
        </div>
        
        {/* Development mode reason display */}
        {isDevEnv && (
          <div className="reason-container">
            <p className="text-lg text-red-500 font-bold">
              Displaying Reason: {this.state.reason || 'No reason provided'}
            </p>
          </div>
        )}
      </Fragment>
    );
  }
}
