import React, { Component, Fragment } from 'react';
import { toaster, DuplicateIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { storage, sendMessage } from 'helpers/webext';
import { isDevEnv } from 'helpers/debug';
import { getValidUrl } from 'helpers/url';
import { isPageReloaded } from 'helpers/block';
import copy from 'copy-to-clipboard';
import './styles.scss';

export class Blocked extends Component {
  constructor(props) {
    super(props);

    this.state = {
      url: '',
      reason: 'INITIALIZING',
      message: props.message || translate('defaultBlockingMessage'),
      displayBlockedLink: props.displayBlockedLink !== undefined ? props.displayBlockedLink : true
    };
    
    // Log construction
    console.log('[Blocked] Constructor called');
  }

  componentDidMount() {
    console.log('[Blocked] componentDidMount - Starting URL parameter extraction');
    
    // Simple direct extraction of parameters from window.location.hash
    const hash = window.location.hash;
    console.log('[Blocked] Raw hash:', hash);
    
    // Get URL parameters from the hash fragment
    let urlParam = null;
    let reasonParam = null;
    
    // Use regex to extract the parameters directly
    const urlMatch = hash.match(/[?&]url=([^&]*)/);
    const reasonMatch = hash.match(/[?&]reason=([^&]*)/);
    
    if (urlMatch && urlMatch[1]) {
      urlParam = urlMatch[1];
      console.log('[Blocked] Found URL param:', urlParam);
    }
    
    if (reasonMatch && reasonMatch[1]) {
      reasonParam = reasonMatch[1];
      console.log('[Blocked] Found reason param:', reasonParam);
    }
    
    // Process the parameters
    let finalUrl = '';
    if (urlParam) {
      try {
        finalUrl = decodeURIComponent(urlParam);
        finalUrl = getValidUrl(finalUrl);
        console.log('[Blocked] Decoded URL:', finalUrl);
      } catch (e) {
        console.error('[Blocked] Error decoding URL:', e);
      }
    }
    
    let finalReason = 'NO_REASON_FOUND';
    if (reasonParam) {
      try {
        finalReason = decodeURIComponent(reasonParam);
        console.log('[Blocked] Decoded reason:', finalReason);
      } catch (e) {
        console.error('[Blocked] Error decoding reason:', e);
      }
    }
    
    // Update state with the extracted parameters
    this.setState({
      url: finalUrl,
      reason: finalReason
    }, () => {
      console.log('[Blocked] State updated with URL and reason');
    });
    
    // Continue with checking if URL is still blocked
    if (isPageReloaded() && finalUrl) {
      sendMessage('isUrlStillBlocked', finalUrl).then((isUrlStillBlocked) => {
        if (isUrlStillBlocked === false) {
          sendMessage('redirectSenderTab', finalUrl);
        }
      });
    }
    
    // Get settings from storage
    storage.get({
      blockTab: {
        message: translate('defaultBlockingMessage'),
        displayBlockedLink: true
      },
      message: '',
      displayBlockedLink: true
    })
    .then((items) => {
      console.log('[Blocked] Storage items:', items);
      
      let customMessage = '';
      let showBlockedLink = true;
      
      if (items.blockTab && typeof items.blockTab === 'object') {
        customMessage = items.blockTab.message || '';
        showBlockedLink = items.blockTab.displayBlockedLink !== undefined ? 
          items.blockTab.displayBlockedLink : true;
      } else {
        customMessage = items.message || '';
        showBlockedLink = items.displayBlockedLink !== undefined ? 
          items.displayBlockedLink : true;
      }
      
      this.setState({
        message: customMessage.length ? customMessage : translate('defaultBlockingMessage'),
        displayBlockedLink: showBlockedLink
      });
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
    console.log('[Blocked] Render - State:', this.state);
    
    // Always use a default message if none is available
    const blockMessage = this.state.message || translate('defaultBlockingMessage');
    
    return (
      <Fragment>
        <div className="distract-cursor distract-select distract-overlay-container">
          <div className="distract-cursor distract-select distract-overlay">
            <div className="distract-cursor distract-select distract-info-container">
              <span className="distract-cursor distract-select distract-overlay-top-text">
                {blockMessage}
              </span>
              
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
              
              {/* Debug information */}
              {isDevEnv && (
                <div style={{
                  background: '#333',
                  color: '#fff',
                  padding: '10px',
                  margin: '10px auto',
                  maxWidth: '80%',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textAlign: 'left'
                }}>
                  <p><strong>Hash:</strong> {window.location.hash}</p>
                  <p><strong>URL param:</strong> {this.state.url}</p>
                  <p><strong>Reason param:</strong> {this.state.reason}</p>
                </div>
              )}
              
              {/* Block reason display */}
              <div className="distract-block-reason">
                <span>{translate('blockedDueTo')}: </span>
                <span className="reason-text">
                  {this.state.reason && this.state.reason !== 'INITIALIZING' && this.state.reason !== 'NO_REASON_FOUND'
                    ? this.state.reason
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
