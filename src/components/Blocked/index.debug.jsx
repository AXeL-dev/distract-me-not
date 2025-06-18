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
      reason: 'INITIALIZING', // Initialize reason state
      message: props.message || translate('defaultBlockingMessage'),
      displayBlockedLink: props.displayBlockedLink !== undefined ? props.displayBlockedLink : true, // Default to showing it
      rawHash: '', // Store the raw hash for debugging
      rawSearch: '', // Store the raw search for debugging
    };
    
    // Log construction
    console.log('[Blocked] Constructor called');
  }

  componentDidMount() {
    // Get full URL and log it for debugging
    const fullUrl = window.location.href;
    const hash = window.location.hash;
    const search = window.location.search;
    
    console.log('[Blocked Page] Component mounted');
    console.log('[Blocked Page] Full URL:', fullUrl);
    console.log('[Blocked Page] Hash:', hash);
    console.log('[Blocked Page] Search:', search);
    
    // Store raw values
    this.setState({
      rawHash: hash,
      rawSearch: search
    });
    
    // Try multiple methods to extract parameters
    let params;
    let paramSource = 'none';
    
    // Method 1: Check if parameters are in hash after #/blocked?
    if (hash && hash.includes('?')) {
      const hashParts = hash.split('?');
      const queryStringInHash = hashParts[1];
      params = new URLSearchParams(queryStringInHash);
      paramSource = 'hash-after-question';
      console.log('[Blocked Page] Method 1 - Params from hash after ?:', Object.fromEntries(params));
    } 
    // Method 2: Check if parameters are in the standard search part
    else if (search) {
      params = new URLSearchParams(search);
      paramSource = 'search';
      console.log('[Blocked Page] Method 2 - Params from search:', Object.fromEntries(params));
    } 
    // Method 3: Check all of the hash (for older versions)
    else if (hash) {
      params = new URLSearchParams(hash.substring(1));
      paramSource = 'full-hash';
      console.log('[Blocked Page] Method 3 - Params from full hash:', Object.fromEntries(params));
    } 
    else {
      // Create empty params as fallback
      params = new URLSearchParams();
      paramSource = 'empty';
      console.log('[Blocked Page] No params found in URL');
    }

    let parsedUrl = params.get('url');
    let parsedReason = params.get('reason');
    
    console.log('[Blocked Page] Raw parsed values - URL:', parsedUrl, 'Reason:', parsedReason);

    let finalUrl = '';
    if (parsedUrl) {
      finalUrl = decodeURIComponent(parsedUrl);
      finalUrl = getValidUrl(finalUrl);
    }

    if (isDevEnv && !finalUrl) {
      finalUrl = 'https://www.example.com'; // Dev fallback
    }
    
    const finalReason = parsedReason ? decodeURIComponent(parsedReason) : 'REASON_NOT_IN_URL_PARAMS'; // Default if not found
    console.log('[Blocked Page] Decoded values - URL:', finalUrl, 'Reason:', finalReason);

    this.setState({ 
      url: finalUrl, 
      reason: finalReason,
      paramSource: paramSource
    }, () => {
      // Log state after URL params are set
      console.log('[Blocked Page] State after URL parse - URL:', this.state.url, 'Reason:', this.state.reason);
    });

    if (isPageReloaded()) {
      console.log('page reloaded!');
      if (finalUrl) { // Use the parsed finalUrl
        sendMessage('isUrlStillBlocked', finalUrl).then((isUrlStillBlocked) => {
          if (isUrlStillBlocked === false) {
            sendMessage('redirectSenderTab', finalUrl);
            // No return needed here
          }
        });
      }
    }
    
    // Query storage for blocking settings including custom message
    storage
      .get({
        // We need to query the blockTab settings specifically
        blockTab: {
          message: translate('defaultBlockingMessage'),
          displayBlockedLink: true
        },
        // For backward compatibility, also check for legacy format
        message: '',
        displayBlockedLink: true
      })
      .then((items) => {
        if (items) {
          // Log the storage data we received
          console.log('[Blocked Page] Storage data received:', items);
          
          // First try to get message from blockTab structure (new format)
          let customMessage = '';
          let showBlockedLink = true;
          
          if (items.blockTab && typeof items.blockTab === 'object') {
            // New structure - blockTab object with message property
            customMessage = items.blockTab.message || '';
            showBlockedLink = items.blockTab.displayBlockedLink !== undefined ? 
              items.blockTab.displayBlockedLink : true;
          } else {
            // Legacy structure - direct message property
            customMessage = items.message || '';
            showBlockedLink = items.displayBlockedLink !== undefined ? 
              items.displayBlockedLink : true;
          }
          
          this.setState({
            message: customMessage.length ? customMessage : translate('defaultBlockingMessage'),
            displayBlockedLink: showBlockedLink
          }, () => {
            // Log state after storage items are applied
            console.log('[Blocked Page] State after storage.get - message:', this.state.message, 'URL:', this.state.url, 'Reason:', this.state.reason);
          });
        } else {
          console.log('[Blocked Page] storage.get returned no items. State remains - URL:', this.state.url, 'Reason:', this.state.reason);
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
    console.log('[Blocked Render] Rendering block page with state:', {
      url: this.state.url,
      reason: this.state.reason,
      displayBlockedLink: this.state.displayBlockedLink,
      message: this.state.message,
      rawHash: this.state.rawHash,
      rawSearch: this.state.rawSearch,
      paramSource: this.state.paramSource
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
              
              {/* Always show debug info */}
              <div className="distract-debug-info">
                <p>Block reason parsing debug:</p>
                <ul>
                  <li><strong>Raw hash:</strong> {this.state.rawHash}</li>
                  <li><strong>Raw search:</strong> {this.state.rawSearch}</li>
                  <li><strong>Param source:</strong> {this.state.paramSource}</li>
                </ul>
              </div>
              
              {/* Always show the block reason */}
              <div className="distract-block-reason">
                <span>{translate('blockedDueTo')}: </span>
                <span className="reason-text">
                  {this.state.reason && this.state.reason !== 'REASON_NOT_IN_URL_PARAMS' && this.state.reason !== 'INITIALIZING'
                    ? this.state.reason // Already decoded in componentDidMount
                    : translate('noSpecificReason')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Blocked;
