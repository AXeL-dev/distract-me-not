import React, { Component } from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { storage } from './helpers/webext';
import { isDevEnv } from './helpers/debug';
import { Panel, Settings, Logs, Background, Blocked, PasswordPrompt, AddWebsitePrompt } from './components';
import { PasswordProtectedRoute } from './routes';

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      accessAllowed: props.accessAllowed, // prop is required for unit tests
    };
  }

  componentDidMount() {
    storage.get({
      password: {
        isEnabled: false
      }
    }).then((items) => {
      this.setState({
        accessAllowed: !items || !items.password.isEnabled
      });
    });
  }

  render() {
    return (
      <Router>
        <Route render={({ location }) => (
          <TransitionGroup className="page">
            <CSSTransition
              key={location.pathname}
              classNames="fade"
              timeout={300}
            >
              <Switch location={location}>
                <PasswordProtectedRoute exact path="/" component={Panel} accessAllowed={this.state.accessAllowed} showPromptHeader={true} showPromptFooter={true} />
                <PasswordProtectedRoute path="/settings" component={Settings} accessAllowed={this.state.accessAllowed} />
                <PasswordProtectedRoute path="/logs" component={Logs} accessAllowed={this.state.accessAllowed} />
                <Route path="/background" component={Background} />
                <Route path="/blocked" component={Blocked} />
                <Route path="/addWebsitePrompt" component={AddWebsitePrompt} />
                {isDevEnv || !this.state.accessAllowed ? (
                  <Route path="/pwd" component={PasswordPrompt} />
                ) : null}
              </Switch>
            </CSSTransition>
          </TransitionGroup>
        )} />
      </Router>
    );
  }
}
