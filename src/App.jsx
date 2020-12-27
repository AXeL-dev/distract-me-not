import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Panel from './components/panel/Panel';
import Settings from './components/settings/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Panel} />
        <Route path="/settings" component={Settings} />
      </Switch>
    </Router>
  );
}

export default App;
