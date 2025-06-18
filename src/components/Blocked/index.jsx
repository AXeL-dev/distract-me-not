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
    console.log('[Blocked] Working with hash:', hash);
    const urlMatch = hash.match(/[?&]url=([^&]*)/);
    const reasonMatch = hash.match(/[?&]reason=([^&]*)/);
    const messageMatch = hash.match(/[?&]message=([^&]*)/);
    
    console.log('[Blocked] URL match:', urlMatch);
    console.log('[Blocked] Reason match:', reasonMatch);
    console.log('[Blocked] Message match:', messageMatch);
    
    let finalUrl = '';
    let finalReason = 'REASON_NOT_FOUND';
    let customMessage = '';
    
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
        // Update terminology from Blacklist to Deny List
        finalReason = finalReason.replace(/Blacklist/g, "Deny List");
        finalReason = finalReason.replace(/blacklist/g, "deny list");
        console.log('[Blocked] Extracted reason (after terminology update):', finalReason);
      } catch (e) {
        console.error('[Blocked] Error decoding reason:', e);
      }
    }
      if (messageMatch && messageMatch[1]) {
      try {
        customMessage = decodeURIComponent(messageMatch[1]);
        console.log('[Blocked] Extracted custom message:', customMessage);
      } catch (e) {
        console.error('[Blocked] Error decoding message:', e);
      }
    }
      
    // Store whether we got a custom message from URL for later reference
    const hasCustomMessageFromUrl = !!customMessage;
    console.log('[Blocked] Has custom message from URL:', hasCustomMessageFromUrl, customMessage);
      
    this.setState({
      url: finalUrl,
      reason: finalReason,
      message: customMessage || this.state.message, // Use extracted message if available
      hash: hash, // Store for debugging
      hasCustomMessageFromUrl: hasCustomMessageFromUrl // Flag to know if message came from URL
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
        // Only use storage settings if we don't already have a message from URL params
      let storageMessage = '';
      let showBlockedLink = true;
      
      if (items.blockTab && typeof items.blockTab === 'object') {
        storageMessage = items.blockTab.message || '';
        showBlockedLink = items.blockTab.displayBlockedLink !== undefined ? 
          items.blockTab.displayBlockedLink : true;
      } else {
        storageMessage = items.message || '';
        showBlockedLink = items.displayBlockedLink !== undefined ? 
          items.displayBlockedLink : true;
      }
      
      // Log for debugging
      console.log('[Blocked] URL message:', this.state.message);
      console.log('[Blocked] Storage message:', storageMessage);
        // Prioritize the URL parameter message over storage settings
      this.setState({
        displayBlockedLink: showBlockedLink,
        // If we have a custom message from URL, always keep it
        message: this.state.hasCustomMessageFromUrl 
          ? this.state.message  // Keep URL message if it exists
          : (storageMessage.length ? storageMessage : translate('defaultBlockingMessage'))
      });
      
      console.log('[Blocked] Final message decision:', 
        this.state.hasCustomMessageFromUrl ? 'Using URL message' : 'Using storage message', 
        'Final message:', this.state.hasCustomMessageFromUrl ? this.state.message : 
          (storageMessage.length ? storageMessage : translate('defaultBlockingMessage')));
    });
  }
  
  copyBlockedLink = () => {
    if (copy(this.state.url)) {
      toaster.success(translate('copiedToClipboard'), {
        id: 'blocked-toaster',
      });
    }
  };
  
  // Format the reason text to distinguish between pattern match and direct denial
  formatReasonText = (reasonText) => {
    if (!reasonText || reasonText === 'INITIALIZING' || reasonText === 'REASON_NOT_FOUND') {
      return translate('noSpecificReason');
    }
    
    // Check if it's a pattern match
    if (reasonText.includes('pattern:')) {
      // It's a pattern match
      const parts = reasonText.split('pattern:');
      if (parts.length >= 2) {
        return (
          <>
            <span style={{ color: '#d0d0d0' }}>
              {translate('denyListPattern')}:
            </span> 
            <span style={{ color: '#db9d61', fontWeight: 'bold', marginLeft: '3px' }}>
              {parts[1].trim()}
            </span>
          </>
        );
      }
    } 
    // Check if it's a direct URL match
    else if (reasonText.includes('://')) {
      return (
        <>
          <span style={{ color: '#d0d0d0' }}>
            {translate('deniedSite')}:
          </span> 
          <span style={{ color: '#db9d61', fontWeight: 'bold', marginLeft: '3px' }}>
            {reasonText}
          </span>
        </>
      );
    }
    
    // Default case - just show the reason as is
    return reasonText;
  };
    render() {
    console.log('[Blocked] Render - State:', this.state);
    
    // Always use a default message if none is available
    // Explicitly log the message being used for rendering
    const blockMessage = this.state.message || translate('defaultBlockingMessage');
    console.log('[Blocked] Using message for rendering:', blockMessage);
    
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
                  wordBreak: 'break-word'
                }}>
                  {this.formatReasonText(this.state.reason)}
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
                }}>                  <p><strong>URL Hash:</strong> {this.state.hash}</p>
                  <p><strong>Parsed URL:</strong> {this.state.url}</p>
                  <p><strong>Parsed Reason:</strong> {this.state.reason}</p>
                  <p><strong>Message from URL:</strong> {this.state.hasCustomMessageFromUrl ? 'Yes' : 'No'}</p>
                  <p><strong>Message being displayed:</strong> {blockMessage}</p>
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
