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
    this.state = {
      url: params.url || ''
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
  }

  handleChange = (event) => {
    this.setState({ url: event.target.value });
  }

  handleSubmit = () => {
    if (!isUrl(this.state.url)) {
      toaster.danger(translate('urlIsNotValid'), { id: 'add-website-toaster' });
    } else {
      blockUrl(this.state.url, this.mode);
      window.close();
    }
  }

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
          required
        />
      </Pane>
    );
  }

}
