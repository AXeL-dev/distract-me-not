import { Component } from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { storage } from './helpers/webext';
import Panel from './components/panel/Panel';
import Settings from './components/settings/Settings';
import Background from './components/background/Background';
import Blocked from './components/blocked/Blocked';
import PasswordProtectedRoute from './routes/PasswordProtectedRoute';
import './App.css';

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      pass: true
    };
  }

  componentDidMount() {
    storage.get({
      password: {
        isEnabled: false
      }
    }).then((items) => {
      if (items && items.password.isEnabled) {
        this.setState({ pass: false });
      }
    });
  }

  render() {
    return (
      <Router>
        <Switch>
          <PasswordProtectedRoute exact path="/" component={Panel} pass={this.state.pass} />
          <PasswordProtectedRoute path="/settings" component={Settings} pass={this.state.pass} />
          <Route path="/background" component={Background} />
          <Route path="/blocked" component={Blocked} />
        </Switch>
      </Router>
    );
  }
}
