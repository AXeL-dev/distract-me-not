import { Pane, Heading } from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import './styles.scss';

export function Header(props) {
  return (
    <Pane display="flex" alignItems="center" justifyContent="center" height={60} borderBottom>
      <img className="logo" src="icons/magnet-256.png" />
      <Heading size={600} fontWeight="bold" className="cursor-default">
        {translate('appName') || 'Distract Me Not'}
      </Heading>
    </Pane>
  );
}
