import { Fragment } from 'react';
import Component from '@reactions/component';
import { Pane, Text, Heading, Switch, SegmentedControl, Tooltip, Position } from 'evergreen-ui';
import { CogIcon, PlusIcon } from 'evergreen-ui';
import './Panel.scss';

function Panel() {
  return (
    <Component
      initialState={{
        status: true,
        modes: [
          { label: 'Black list', value: 'blacklist' },
          { label: 'White list', value: 'whitelist' },
        ],
        mode: 'blacklist'
      }}
    >
      {({ state, setState }) => (
        <Fragment>
          <Pane display="flex" alignItems="center" justifyContent="center" height={64} borderBottom>
            <img class="logo" src="icons/magnet-256.png" />
            <Heading size={600} className="bold">Distract Me Not</Heading>
          </Pane>
          <Pane display="flex" padding={16}>
            <Pane flex={1} alignItems="center" display="flex">
              <Text>Status</Text>
            </Pane>
            <Pane>
              <Switch
                height={24}
                checked={state.status}
                onChange={event => setState({ status: event.target.checked })}
              />
            </Pane>
          </Pane>
          <Pane display="flex" padding={16}>
            <Pane flex={1} alignItems="center" display="flex">
              <Text>Mode</Text>
            </Pane>
            <Pane>
              <SegmentedControl
                name="mode"
                className="custom-segmented-control"
                width={240}
                options={state.modes}
                value={state.mode}
                onChange={value => setState({ mode: value })}
              />
            </Pane>
          </Pane>
          <Pane display="flex" padding={16} justifyContent="space-between" borderTop>
            <Pane>
              <Tooltip content="Settings" position={Position.RIGHT} showDelay={200}>
                <CogIcon className="cursor-pointer grow" size={24} />
              </Tooltip>
            </Pane>
            <Pane>
              <Tooltip content="Add" position={Position.LEFT} showDelay={200}>
                <PlusIcon className="cursor-pointer grow" size={28} color="success" />
              </Tooltip>
            </Pane>
          </Pane>
        </Fragment>
      )}
    </Component>
  );
}

export default Panel;
