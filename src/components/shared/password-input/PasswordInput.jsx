import { Component } from 'react';
import { Pane, TextInput, IconButton, Paragraph, EyeOpenIcon, EyeOffIcon } from 'evergreen-ui';
import RawHTML from '../raw-html/RawHTML';
import './PasswordInput.scss';

export default class PasswordInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value: props.value || '',
      isShown: false
    };
  }

  handleChange = (event) => {
    this.setState({ value: event.target.value });
    if (this.props.onChange) {
      this.props.onChange(event);
    }
  }

  toggle = (event) => {
    this.setState({ isShown: !this.state.isShown });
  }

  render() {
    return (
      <Pane
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
        <Pane display="flex">
          <Pane display="flex" alignItems="center" flex={1} position="relative">
            <TextInput
              width="100%"
              type={this.state.isShown ? 'text' : 'password'}
              value={this.state.value}
              onChange={this.handleChange}
              placeholder={this.props.placeholder}
              disabled={this.props.disabled}
              required={this.props.required}
              data-testid={this.props['data-testid']}
              paddingRight={40}
            />
            <IconButton
              appearance="minimal"
              className="password-toggle"
              icon={this.state.isShown ? EyeOffIcon : EyeOpenIcon}
              iconSize={18}
              paddingX={20}
              onClick={this.toggle}
              disabled={this.props.disabled}
            />
          </Pane>
        </Pane>
        {this.props.hint &&
          <Paragraph size={300} color="muted" marginTop={6}>
            <RawHTML>{this.props.hint}</RawHTML>
          </Paragraph>
        }
      </Pane>
    );
  }

}
