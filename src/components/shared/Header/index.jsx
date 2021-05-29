import React from 'react';
import { Pane, Heading } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { isFirefox } from 'helpers/webext';
import './styles.scss';

export function Header(props) {
  return (
    <Pane
      display="flex"
      alignItems="center"
      justifyContent="center"
      height={62}
      borderBottom
    >
      <img className="logo" alt="logo" src="icons/magnet-256.png" />
      <Heading
        size={600}
        height={isFirefox ? 20 : 'initial'}
        fontWeight="bold"
        className="cursor-default"
      >
        {translate('appName') || 'Distract Me Not'}
      </Heading>
    </Pane>
  );
}
