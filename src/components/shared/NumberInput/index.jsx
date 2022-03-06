import React, { Component } from 'react';
import { debug } from 'helpers/debug';

export class NumberInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.value || props.min || null,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    //debug.log({ props: this.props, prevProps: prevProps, state: this.state, prevState: prevState });
    if (this.props.value !== prevProps.value && this.props.value !== this.state.value) {
      debug.warn('value prop has changed:', this.props.value);
      this.setState({
        value: this.validateValue(this.props.value),
      });
    }
  }

  validateValue = (value) => {
    const intValue = parseInt(value);
    const min = this.props.min !== undefined ? this.props.min : null;
    const max = this.props.max !== undefined ? this.props.max : null;
    if (min !== null && intValue < min) {
      return min;
    } else if (max !== null && intValue > max) {
      return max;
    }
    return intValue;
  };

  handleChange = (event) => {
    const value = this.validateValue(event.target.value);
    this.setState({ value }); // equivalent to { value: value }
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  };

  render() {
    return (
      <input
        type="number"
        min={this.props.min}
        max={this.props.max}
        step={this.props.step}
        style={{ width: this.props.width || 100 }}
        value={this.state.value}
        onChange={this.handleChange}
        disabled={this.props.disabled}
        required={this.props.required}
      />
    );
  }
}
