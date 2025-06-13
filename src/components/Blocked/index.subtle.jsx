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
    
    console.log('[Blocked] Constructor called, props:', props);
  }

  componentDidMount() {
    console.log('[Blocked] componentDidMount - Starting extraction');
    
    // Log all URL parts
    console.log('[Blocked] window.location.href:', window.location.href);
    console.log('[Blocked] window.location.hash:', window.location.hash);
    console.log('[Blocked] window.location.search:', window.location.search);
    
    // Try direct extraction with regex for most reliable parsing
    const hash = window.location.hash;
    const urlMatch = hash.match(/[?&]url=([^&]*)/);
    const reasonMatch = hash.match(/[?&]reason=([^&]*)/);
    
    let finalUrl = '';
    let finalReason = 'REASON_NOT_FOUND';
    
    if (urlMatch && urlMatch[1]) {
      try {
        finalUrl = decodeURIComponent(urlMatch[1]);
        console.log('[Blocked] Extracted URL:', finalUrl);
      } catch (e) {
        console.error('[Blocked] Error decoding URL:', e);
      }
    }
    
    if (reasonMatch && reasonMatch[1]) {
      try {
        finalReason = decodeURIComponent(reasonMatch[1]);
        console.log('[Blocked] Extracted reason:', finalReason);
      } catch (e) {
        console.error('[Blocked] Error decoding reason:', e);
      }
    }
    
    this.setState({
      url: finalUrl,
      reason: finalReason,
      hash: hash // Store for debugging
    });
    
    // Handle redirects if needed
    if (isPageReloaded() && finalUrl) {
      sendMessage('isUrlStillBlocked', finalUrl).then((isUrlStillBlocked) => {
        if (isUrlStillBlocked === false) {
          sendMessage('redirectSenderTab', finalUrl);
        }
      });
    }
    
    // Get settings
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
              
              {/* Subtle block reason display */}
              <div style={{
                margin: '20px auto 0',
                padding: '12px', 
                backgroundColor: 'transparent',
                color: '#d0d0d0',
                fontFamily: 'OpenSansFont, Arial, sans-serif',
                fontSize: '15px',
                maxWidth: '80%',
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: '5px', color: '#d0d0d0', fontWeight: 'normal' }}>
                  {translate('blockedDueTo')}:
                </div>
                <div style={{ 
                  color: '#db9d61',
                  fontWeight: 'bold',
                  wordBreak: 'break-word'
                }}>
                  {this.state.reason && this.state.reason !== 'INITIALIZING' && this.state.reason !== 'REASON_NOT_FOUND'
                    ? this.state.reason
                    : translate('noSpecificReason')}
                </div>
              </div>
              
              {/* Debug info in development mode */}
              {isDevEnv && (
                <div style={{
                  marginTop: '20px',
                  padding: '10px',
                  backgroundColor: '#333',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  maxWidth: '90%',
                  margin: '20px auto',
                  textAlign: 'left'
                }}>
                  <p><strong>URL Hash:</strong> {this.state.hash}</p>
                  <p><strong>Parsed URL:</strong> {this.state.url}</p>
                  <p><strong>Parsed Reason:</strong> {this.state.reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Blocked;
