import { Component, Fragment } from 'react';
import { Pane, TextInput, Button, Paragraph } from 'evergreen-ui';
import RawHTML from '../raw-html/RawHTML';

export default class ButtonTextField extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value: props.value || ''
    };
  }

  handleChange = (event) => {
    this.setState({ value: event.target.value });
    if (this.props.onChange) {
      this.props.onChange(event);
    }
  }

  handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      this.props.onSubmit(event.target.value);
    }
  }

  handleButtonClick = () => {
    this.props.onSubmit(this.state.value);
  }

  render() {
    return (
      <Fragment>
        <Pane
          display="flex"
          padding={this.props.padding}
          paddingX={this.props.paddingX || this.props.padding}
          paddingY={this.props.paddingY || this.props.padding}
          paddingTop={this.props.paddingTop || this.props.paddingY}
          paddingBottom={this.props.paddingBottom || this.props.paddingY}
          paddingLeft={this.props.paddingLeft || this.props.paddingX}
          paddingRight={this.props.paddingRight || this.props.paddingX}
          margin={this.props.margin}
          marginX={this.props.marginX || this.props.margin}
          marginY={this.props.marginY || this.props.margin}
          marginTop={this.props.marginTop || this.props.marginY}
          marginBottom={this.props.marginBottom || this.props.marginY}
          marginLeft={this.props.marginLeft || this.props.marginX}
          marginRight={this.props.marginRight || this.props.marginX}
        >
          <Pane display="flex" alignItems="center" flex={1}>
            <TextInput
              width="100%"
              value={this.state.value}
              onChange={this.handleChange}
              onKeyPress={this.handleKeyPress}
              placeholder={this.props.placeholder}
              disabled={this.props.disabled}
              required={this.props.required}
              borderTopRightRadius={0}
              borderBottomRightRadius={0}
            />
          </Pane>
          <Pane display="flex" alignItems="center" marginLeft={-1}>
            <Button
              appearance={this.props.buttonAppearance || 'primary'}
              borderTopLeftRadius={0}
              borderBottomLeftRadius={0}
              onClick={this.handleButtonClick}
            >
              {this.props.buttonLabel || '+'}
            </Button>
          </Pane>
        </Pane>
        {this.props.hint &&
          <Paragraph size={300} color="muted" marginTop={6}>
            <RawHTML>{this.props.hint}</RawHTML>
          </Paragraph>
        }
      </Fragment>
    );
  }
}
