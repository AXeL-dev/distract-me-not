import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Panel from './components/panel/Panel';
import Settings from './components/settings/Settings';
import Background from './components/background/Background';
import './App.css';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Panel} />
        <Route path="/settings" component={Settings} />
        <Route path="/background" component={Background} />
      </Switch>
    </Router>
  );
}
