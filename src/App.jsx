import React, { Component } from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { storage } from './helpers/webext';
import { isDevEnv } from './helpers/debug';
import { Panel, Settings, Logs, Background, Blocked, PasswordPrompt, AddWebsitePrompt } from './components';
import { PasswordProtectedRoute } from './routes';

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      accessAllowed: props.accessAllowed // == undefined (prop is required for unit tests)
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
        <Switch>
          <PasswordProtectedRoute exact path="/" component={Panel} accessAllowed={this.state.accessAllowed} showPromptHeader={true} showPromptFooter={true} />
          <PasswordProtectedRoute path="/settings" component={Settings} accessAllowed={this.state.accessAllowed} />
          <PasswordProtectedRoute path="/logs" component={Logs} accessAllowed={this.state.accessAllowed} />
          <Route path="/background" component={Background} />
          <Route path="/blocked" component={Blocked} />
          <Route path="/addWebsitePrompt" component={AddWebsitePrompt} />
          {isDevEnv && (
            <Route path="/pwd" component={PasswordPrompt} />
          )}
        </Switch>
      </Router>
    );
  }
}
