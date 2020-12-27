import { Fragment } from 'react';
import Component from '@reactions/component';
import { Pane, Text, Heading, Switch, SegmentedControl, Tooltip, Position } from 'evergreen-ui';
import { CogIcon, PlusIcon } from 'evergreen-ui';
import { getTextTranslation } from '../../helpers/i18n';
import './Panel.scss';

function Panel() {
  const i18n = {
    appName: getTextTranslation('appName', 'Distract Me Not'),
    status: getTextTranslation('main_status', 'Status'),
    mode: getTextTranslation('main_mode', 'Mode'),
    blacklist: getTextTranslation('settings_blacklist_title', 'Blacklist'),
    whitelist: getTextTranslation('settings_whitelist_title', 'Whitelist'),
    settings: getTextTranslation('main_settings_tooltip', 'Settings'),
    addToList: getTextTranslation('main_add_blacklist_tooltip', 'Add website to list'),
  };

  return (
    <Component
      initialState={{
        status: true,
        modes: [
          { label: i18n.blacklist, value: 'blacklist' },
          { label: i18n.whitelist, value: 'whitelist' },
        ],
        mode: 'blacklist'
      }}
    >
      {({ state, setState }) => (
        <Fragment>
          <Pane display="flex" alignItems="center" justifyContent="center" height={64} borderBottom>
            <img className="logo" src="icons/magnet-256.png" />
            <Heading size={600} className="bold">{i18n.appName}</Heading>
          </Pane>
          <Pane display="flex" paddingX={16} paddingY={20}>
            <Pane flex={1} alignItems="center" display="flex">
              <Text>{i18n.status}</Text>
            </Pane>
            <Pane>
              <Switch
                height={24}
                checked={state.status}
                onChange={event => setState({ status: event.target.checked })}
              />
            </Pane>
          </Pane>
          <Pane display="flex" paddingX={16} paddingBottom={20} style={{ minWidth: 320 }}>
            <Pane flex={1} alignItems="center" display="flex">
              <Text>{i18n.mode}</Text>
            </Pane>
            <Pane>
              <SegmentedControl
                name="mode"
                className="custom-segmented-control"
                width={200}
                options={state.modes}
                value={state.mode}
                onChange={value => setState({ mode: value })}
              />
            </Pane>
          </Pane>
          <Pane display="flex" paddingX={16} paddingY={12} alignItems="center" justifyContent="space-between" borderTop>
            <Pane>
              <Tooltip content={i18n.settings} position={Position.RIGHT} showDelay={200}>
                <CogIcon className="icon-button fill-grey grow" size={22} />
              </Tooltip>
            </Pane>
            <Pane>
              <Tooltip content={i18n.addToList} position={Position.LEFT} showDelay={200}>
                <PlusIcon className="icon-button grow" size={26} color="success" />
              </Tooltip>
            </Pane>
          </Pane>
        </Fragment>
      )}
    </Component>
  );
}

export default Panel;
