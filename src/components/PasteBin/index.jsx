import React, { Component } from 'react';
import { Pane, Paragraph, toaster, DuplicateIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { debug, isDevEnv } from 'helpers/debug';
import { isUrl, getValidUrl } from 'helpers/url';
import queryString from 'query-string';
import copy from 'copy-to-clipboard';
import './styles.scss';

export class PasteBin extends Component {
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
    debug.log({ url: this.url, props });
  }

  copyUrl = () => {
    if (copy(this.url)) {
      toaster.success(translate('copiedToClipboard'), {
        id: 'pastebin-toaster',
      });
    }
  };

  render() {
    if (!this.url) {
      return null;
    }

    return (
      <Pane
        display="flex"
        flex={1}
        width="100%"
        height="100%"
        alignItems="center"
        justifyContent="center"
        backgroundColor="rgba(0, 0, 0, 0.9)"
      >
        <Pane display="flex" flexDirection="column" width="50%" maxWidth={800}>
          <span className="bin">
            <input type="text" value={this.url || ''} readOnly />
            <button className="copy" title={translate('copy')} onClick={this.copyUrl}>
              <DuplicateIcon />
            </button>
          </span>
          <Paragraph size={300} color="muted" marginTop={16}>
            {translate('pasteBinTip', [60, translate('seconds')])}
          </Paragraph>
        </Pane>
      </Pane>
    );
  }
}
