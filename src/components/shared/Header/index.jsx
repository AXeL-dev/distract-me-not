import React from 'react';
import { Pane, Heading } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import './styles.scss';

export function Header(props) {
  return (
    <Pane
      display="flex"
      alignItems="center"
      justifyContent={props.justifyContent || 'center'}
      height={props.height || 62}
      borderBottom={!props.noBorderBottom}
      marginBottom={props.marginBottom}
    >
      <img className="logo" alt="logo" src="icons/magnet-256.png" />
      <Heading
        size={600}
        fontFamily="Roboto, arial, sans-serif"
        fontWeight="bold"
        className="cursor-default"
        color="#333"
      >
        {translate('appName') || 'Distract Me Not'}
      </Heading>
    </Pane>
  );
}
