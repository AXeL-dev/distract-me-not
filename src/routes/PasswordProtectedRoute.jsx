import React from 'react';
import { Route } from 'react-router-dom';
import { debug } from 'helpers/debug';
import { PasswordPrompt } from 'components';

// Inspired from: https://blog.netcetera.com/how-to-create-guarded-routes-for-your-react-app-d2fe7c7b6122

function getFullRoute(path) {
  if (path) {
    // return path + hash parameters
    const regex = new RegExp(`^#${path}`);
    const params = window.location.hash.replace(regex, '');
    return `${path}${params}`;
  } else {
    return '/';
  }
}

export const PasswordProtectedRoute = ({
  path,
  component: Component,
  accessAllowed,
  showPromptHeader,
  showPromptFooter,
  ...rest
}) => (
  <Route
    path={path}
    {...rest}
    render={(props) => {
      debug.log({ accessAllowed, location: props.location });

      return accessAllowed === undefined || accessAllowed === null ? (
        null
      ) : accessAllowed === true || (props.location.state && props.location.state.accessAllowed === true) ? (
        <Component {...props} />
      ) : (
        <PasswordPrompt
          path={getFullRoute(path)}
          hasHeader={showPromptHeader}
          hasFooter={showPromptFooter}
          {...props}
        />
      );
    }}
  />
);
