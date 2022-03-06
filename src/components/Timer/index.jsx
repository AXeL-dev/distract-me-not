import React, { Component } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { Pane, Button, HomeIcon, PlayIcon, StopIcon } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { sendMessage } from 'helpers/webext';
import { isTestEnv } from 'helpers/debug';
import { SettingsButton, LinkIconButton } from 'components';
import { defaultTimerSettings, formatRemainingTime, hmsToSeconds } from 'helpers/timer';
import './styles.scss';

const StoppedState = {
  isPlaying: false,
  duration: 1,
  initialRemainingTime: 0,
};

export class Timer extends Component {
  constructor(props) {
    super(props);
    this.referer = this.getLocationStateProp('referer');
    this.state = {
      ready: isTestEnv ? true : false,
      key: 0,
      hms: '00:00',
      settings: defaultTimerSettings,
      ...StoppedState,
    };
  }

  componentDidMount() {
    sendMessage('getTimerSettings').then((timer) => {
      const settings = timer || defaultTimerSettings;
      this.setState({
        settings,
        hms: settings.defaultValue,
        duration: settings.runtime.duration || 1,
        initialRemainingTime: settings.runtime.remainingDuration || 0,
        isPlaying: true,
        ready: true,
      });
    });
  }

  getLocationStateProp(prop) {
    return this.props.location && this.props.location.state
      ? this.props.location.state[prop]
      : undefined;
  }

  renderTime = ({ remainingTime }) => {
    if (remainingTime === 0) {
      return (
        <div className="timer off ub-fnt-fam_b77syt">
          <input
            type="time"
            value={this.state.hms}
            onChange={(event) => {
              this.setState({ hms: event.target.value });
            }}
          />
          <Button
            height={24}
            maxWidth="100%"
            className="button"
            appearance="primary"
            iconBefore={PlayIcon}
            onClick={() => {
              const duration = hmsToSeconds(this.state.hms);
              this.setState((state) => ({
                duration,
                initialRemainingTime: duration,
                isPlaying: true,
                key: ++state.key,
              }));
              sendMessage('startTimer', duration);
            }}
            disabled={this.state.hms === '00:00'}
          >
            {translate('start')}
          </Button>
        </div>
      );
    }

    return (
      <div className="timer ub-fnt-fam_b77syt">
        {!this.state.settings.allowStoppingTimer ? (
          <div className="text">{translate('remainingTime')}</div>
        ) : null}
        <div className="value">{formatRemainingTime(remainingTime)}</div>
        {this.state.settings.allowStoppingTimer ? (
          <Button
            height={24}
            maxWidth="100%"
            className="button"
            appearance="primary"
            iconBefore={StopIcon}
            onClick={() => {
              this.setState((state) => ({
                ...StoppedState,
                key: ++state.key,
              }));
              sendMessage('stopTimer');
            }}
          >
            {translate('stop')}
          </Button>
        ) : null}
      </div>
    );
  };

  render() {
    return (
      <Pane minWidth={350}>
        {!this.state.ready ? null : (
          <>
            {/* <Header /> */}
            <Pane
              display="flex"
              minHeight={177}
              paddingX={16}
              paddingY={18}
              alignItems="center"
              justifyContent="center"
            >
              <CountdownCircleTimer
                key={this.state.key}
                isPlaying={this.state.isPlaying}
                duration={this.state.duration}
                initialRemainingTime={this.state.initialRemainingTime}
                size={140}
                strokeWidth={8}
                colors="#2952CC"
                onComplete={() => {
                  this.setState({ isPlaying: false });
                }}
              >
                {this.renderTime}
              </CountdownCircleTimer>
            </Pane>
            <Pane
              display="flex"
              paddingX={16}
              paddingY={10}
              alignItems="center"
              justifyContent="space-between"
              borderTop
            >
              <Pane display="flex" gap={10}>
                <LinkIconButton
                  icon={HomeIcon}
                  link="/panel"
                  sameTab
                  state={{ accessAllowed: this.referer === 'panel' }}
                  tooltip={translate('mainPanel')}
                  history={this.props.history}
                  disabled={this.state.isPlaying}
                />
                <SettingsButton
                  history={this.props.history}
                  disabled={this.state.isPlaying}
                />
              </Pane>
              <Pane>{/* right space */}</Pane>
            </Pane>
          </>
        )}
      </Pane>
    );
  }
}
