import { Component } from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { storage } from './helpers/webext';
import { isDevEnv } from './helpers/debug';
import Panel from './components/panel/Panel';
import Settings from './components/settings/Settings';
import Background from './components/background/Background';
import Blocked from './components/blocked/Blocked';
import PasswordPrompt from './components/password-prompt/PasswordPrompt';
import PasswordProtectedRoute from './routes/PasswordProtectedRoute';
import './App.css';

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      accessAllowed: null
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
          <Route path="/background" component={Background} />
          <Route path="/blocked" component={Blocked} />
          {isDevEnv && (
            <Route path="/pwd" component={PasswordPrompt} />
          )}
        </Switch>
      </Router>
    );
  }
}
