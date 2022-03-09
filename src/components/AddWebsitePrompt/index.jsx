import React, { Component } from 'react';
import { Pane, toaster } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { TextField } from 'components';
import { Mode, blockUrl } from 'helpers/block';
import { isUrl } from 'helpers/url';
import queryString from 'query-string';

export class AddWebsitePrompt extends Component {
  constructor(props) {
    super(props);
    const params = props.location ? queryString.parse(props.location.search) : {};
    this.mode = params.mode || Mode.blacklist;
    this.tabId = +params.tabId || null;
    this.state = {
      url: params.url || '',
      disabled: false,
    };
  }

  componentDidMount() {
    document.addEventListener('keyup', this.handleKeyUp);
  }

  componentWillUnmount() {
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyUp = (event) => {
    if (event.code === 'Escape') {
      window.close();
    }
  };

  handleChange = (event) => {
    this.setState({ url: event.target.value });
  };

  handleSubmit = async () => {
    if (!isUrl(this.state.url)) {
      toaster.danger(translate('urlIsNotValid'), {
        id: 'add-website-toaster',
      });
    } else {
      this.setState({ disabled: true });
      try {
        const blocked = await blockUrl(this.state.url, this.mode, this.tabId);
        if (blocked) {
          window.close();
        } else {
          throw new Error(translate('urlAlreadyExists'));
        }
      } catch (error) {
        toaster.danger(error.message, { id: 'add-website-toaster' });
        this.setState({ disabled: false });
      }
    }
  };

  render() {
    return (
      <Pane
        display="flex"
        flex={1}
        width="100%"
        height="100%"
        minWidth={500}
        minHeight={120}
        padding={30}
        alignItems="center"
        justifyContent="center"
      >
        <TextField
          placeholder={translate('urlExample')}
          hint={translate('addWebsiteHint')}
          value={this.state.url}
          hasButton={true}
          buttonLabel={translate('add')}
          onSubmit={this.handleSubmit}
          onChange={this.handleChange}
          disabled={this.state.disabled}
          required
        />
      </Pane>
    );
  }
}
