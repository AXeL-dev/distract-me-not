import React from 'react';
import './styles.scss';

export function TruncatedText({ children, ...props }) {
  return (
    <span className="overflow-ellipsis" {...props}>
      {children}
    </span>
  );
}
