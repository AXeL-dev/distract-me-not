import React from 'react';
import { Tooltip as Tip } from 'evergreen-ui';
import './styles.scss';

export function Tooltip({ content, children, disabled, ...props }) {
  return (
    <Tip
      {...props}
      statelessProps={{ paddingX: 8, paddingY: 4, borderRadius: 3 }}
      content={<p className="ub-fnt-fam_b77syt tooltip">{content}</p>}
      {...(disabled ? { isShown: false } : {})}
    >
      {children}
    </Tip>
  );
}
