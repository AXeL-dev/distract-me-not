import React from 'react';
import { Route } from 'react-router-dom';
import { debug } from '../helpers/debug';
import PasswordPrompt from '../components/password-prompt/PasswordPrompt';

// Inspired from: https://blog.netcetera.com/how-to-create-guarded-routes-for-your-react-app-d2fe7c7b6122

const PasswordProtectedRoute = ({ component: Component, pass, path, ...rest }) => (
  <Route path={path} {...rest} render={(props) => {
    debug.log('location:', props.location);
    return pass === true || (props.location.state && props.location.state.pass === true) ? (
      <Component {...props} />
     ) : (
      <PasswordPrompt path={path} {...props} />
     );
  }} />
)

export default PasswordProtectedRoute;
