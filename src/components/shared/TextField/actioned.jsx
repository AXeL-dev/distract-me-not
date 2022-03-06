import React, { Component } from 'react';
import { Pane, TextInput, Button, Paragraph } from 'evergreen-ui';
import { RawHTML, OuterPane } from 'components';

class TextField extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.value || '',
    };
  }

  handleChange = (event) => {
    this.setState({ value: event.target.value });
    if (this.props.onChange) {
      this.props.onChange(event);
    }
  };

  handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      this.submit();
    }
  };

  handleButtonClick = (event) => {
    this.submit();
  };

  submit = () => {
    if (this.props.onSubmit && !this.props.disabled) {
      const callback = (value) => this.setState({ value: value });
      this.props.onSubmit(this.state.value, callback);
    }
  };

  render() {
    return (
      <OuterPane {...this.props}>
        <Pane display="flex">
          <Pane display="flex" alignItems="center" flex={1}>
            <TextInput
              width="100%"
              value={this.state.value}
              onChange={this.handleChange}
              onKeyDown={this.handleKeyDown}
              placeholder={this.props.placeholder}
              required={this.props.required}
              borderTopRightRadius={this.props.hasButton ? 0 : 3}
              borderBottomRightRadius={this.props.hasButton ? 0 : 3}
            />
          </Pane>
          {this.props.hasButton && (
            <Pane display="flex" alignItems="center" marginLeft={-1}>
              <Button
                appearance={this.props.buttonAppearance || 'primary'}
                borderTopLeftRadius={0}
                borderBottomLeftRadius={0}
                onClick={this.handleButtonClick}
                disabled={this.props.disabled}
              >
                {this.props.buttonLabel || '+'}
              </Button>
            </Pane>
          )}
        </Pane>
        {this.props.hint && (
          <Paragraph size={300} color="muted" marginTop={6}>
            <RawHTML>{this.props.hint}</RawHTML>
          </Paragraph>
        )}
      </OuterPane>
    );
  }
}

export default TextField;
