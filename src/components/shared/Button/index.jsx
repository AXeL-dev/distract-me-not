import React from 'react';
import { Button as DefaultButton } from 'evergreen-ui';
import './styles.scss';

export function Button({ children, ...props }) {
  return (
    <DefaultButton {...props}>
      <span className="truncate">{children}</span>
    </DefaultButton>
  );
}
