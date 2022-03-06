import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import { sendMessage } from 'helpers/webext';

export class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ready: false,
      isTimerActive: false,
    };
  }

  componentDidMount() {
    sendMessage('isTimerActive').then((isTimerActive) => {
      this.setState({
        isTimerActive: !!isTimerActive, // cast null to boolean
        ready: true,
      });
    });
  }

  render() {
    if (!this.state.ready) {
      return null;
    }

    const pathname = this.state.isTimerActive ? '/timer' : '/panel';

    return (
      <Redirect
        to={{
          pathname,
          state: {
            accessAllowed: pathname === '/timer',
          },
        }}
      />
    );
  }
}
