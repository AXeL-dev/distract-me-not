import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { debug } from 'helpers/debug';

// Inspired from: https://blog.netcetera.com/how-to-create-guarded-routes-for-your-react-app-d2fe7c7b6122

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

      return accessAllowed === undefined ||
        accessAllowed === null ? null : accessAllowed === true ||
        (props.location.state && props.location.state.accessAllowed === true) ? (
        <Component {...props} />
      ) : (
        <Redirect
          to={{
            pathname: '/pwd',
            state: {
              path,
              search: props.location.search,
              hasHeader: showPromptHeader,
              hasFooter: showPromptFooter,
            },
          }}
        />
      );
    }}
  />
);
