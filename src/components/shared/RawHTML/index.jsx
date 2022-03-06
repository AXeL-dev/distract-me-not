import React from 'react';

export function RawHTML({ children, className = '' }) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{
        __html: children.replace(/\n/g, '<br />'),
      }}
    />
  );
}
