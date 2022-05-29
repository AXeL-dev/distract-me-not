import React, { Component } from 'react';
import { filter } from 'fuzzaldrin-plus';
import { format } from 'date-fns';
import {
  Pane,
  Table,
  Popover,
  Position,
  Menu,
  Text,
  IconButton,
  MoreIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CaretDownIcon,
  TextDropdownButton,
  TickCircleIcon,
  RefreshIcon,
  TimeIcon,
} from 'evergreen-ui';
import { sendMessage } from 'helpers/webext';
import { translate } from 'helpers/i18n';
import { getHostname } from 'helpers/url';
import { isDevEnv } from 'helpers/debug';
import { now } from 'helpers/date';
import './styles.scss';

const Order = {
  NONE: 'NONE',
  ASC: 'ASC',
  DESC: 'DESC',
};

const allowedHostsDataset = [
  {
    time: 60000 * 10,
    startedAt: new Date().getTime(),
    hostname: getHostname('https://www.website1.com'),
  },
  {
    time: 60000 * 15,
    startedAt: new Date().getTime(),
    hostname: getHostname('https://www.website2.com'),
  },
  {
    time: 60000 * 30,
    startedAt: new Date().getTime(),
    hostname: getHostname('https://www.website3.com'),
  },
];

export class Allowed extends Component {
  constructor(props) {
    super(props);
    this.state = {
      list: [],
      searchQuery: '',
      orderedColumn: 1,
      scrollToIndex: null,
      showRemainingTime: true,
      currentTime: now(true),
      ordering: Order.NONE,
    };
  }

  componentDidMount() {
    this.fetchAllowedHosts();
    this.interval = setInterval(() => this.setState({ currentTime: now(true) }), 1000);
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  fetchAllowedHosts = (scrollToTop = false) => {
    sendMessage('getTmpAllowed').then((allowed) => {
      const data = isDevEnv ? allowedHostsDataset : allowed;
      this.setState({
        list: this.getOrderedList(data).filter((row) => this.getRemainingTime(row) > 0),
        scrollToIndex: scrollToTop
          ? data.length > 0
            ? 0
            : null
          : this.state.scrollToIndex,
      });
    });
  };

  getRemainingTime = (row) => {
    const endTime = row.startedAt + row.time;
    return endTime > this.state.currentTime ? endTime - this.state.currentTime : 0;
  };

  getOrderedList = (list) => {
    return list ? list.map((item, index) => ({ id: index + 1, ...item })) : [];
  };

  sort = (items) => {
    const { ordering } = this.state;
    // Return if there's no ordering.
    if (ordering === Order.NONE) return items;

    // Get the property to sort each item on.
    // By default use the `hostname` property.
    let propKey = 'hostname';

    return items.sort((a, b) => {
      let aValue = a[propKey];
      let bValue = b[propKey];

      // Support string comparison
      const sortTable = { true: 1, false: -1 };

      // Order ascending (Order.ASC)
      if (this.state.ordering === Order.ASC) {
        return aValue === bValue ? 0 : sortTable[aValue > bValue];
      }

      // Order descending (Order.DESC)
      return bValue === aValue ? 0 : sortTable[bValue > aValue];
    });
  };

  // Filter the items based on the name property.
  filter = (items) => {
    const searchQuery = this.state.searchQuery.trim();

    // If the searchQuery is empty, return the items as is.
    if (searchQuery.length === 0) return items;

    return items.filter((item) => {
      // Use the filter from fuzzaldrin-plus to filter by hostname.
      const result = filter([item.hostname], searchQuery);
      return result.length === 1;
    });
  };

  getIconForOrder = (order) => {
    switch (order) {
      case Order.ASC:
        return ArrowUpIcon;
      case Order.DESC:
        return ArrowDownIcon;
      default:
        return CaretDownIcon;
    }
  };

  handleFilterChange = (value) => {
    this.setState({ searchQuery: value });
  };

  renderColumnSortButton = ({ orderedColumn, label }) => {
    return (
      <Popover
        position={Position.BOTTOM_LEFT}
        minWidth={160}
        content={({ close }) => (
          <Menu>
            <Menu.OptionsGroup
              title={translate('order')}
              options={[
                { label: translate('ascending'), value: Order.ASC },
                { label: translate('descending'), value: Order.DESC },
              ]}
              selected={
                this.state.orderedColumn === orderedColumn ? this.state.ordering : null
              }
              onChange={(value) => {
                this.setState({
                  orderedColumn,
                  ordering: value,
                });
                // Close the popover when you select a value.
                close();
              }}
            />
          </Menu>
        )}
      >
        <TextDropdownButton
          icon={
            this.state.orderedColumn === orderedColumn
              ? this.getIconForOrder(this.state.ordering)
              : CaretDownIcon
          }
          data-testid="sort-button"
        >
          {label}
        </TextDropdownButton>
      </Popover>
    );
  };

  renderColumnTimeButton = ({ label } = {}) => {
    return (
      <Popover
        position={Position.BOTTOM_LEFT}
        minWidth={160}
        content={({ close }) => (
          <Menu>
            <Menu.OptionsGroup
              title={translate('remainingTime')}
              options={[
                { label: translate('show'), value: true },
                { label: translate('hide'), value: false },
              ]}
              selected={this.state.showRemainingTime}
              onChange={(value) => {
                this.setState({ showRemainingTime: value });
                // Close the popover when you select a value.
                close();
              }}
            />
          </Menu>
        )}
      >
        <TextDropdownButton icon={TimeIcon} data-testid="date-button">
          {label}
        </TextDropdownButton>
      </Popover>
    );
  };

  renderHeaderMenu = ({ close }) => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item
            icon={RefreshIcon}
            onSelect={() => {
              this.fetchAllowedHosts(true);
              close();
            }}
          >
            {translate('refresh')}
          </Menu.Item>
        </Menu.Group>
      </Menu>
    );
  };

  renderRow = ({ row }) => {
    const remainingTime = this.getRemainingTime(row);

    return (
      <Table.Row key={row.id} height={38}>
        <Table.Cell
          flex={this.state.showRemainingTime ? 1 : 'none'}
          display="flex"
          alignItems="center"
          title={translate('allowed')}
        >
          <TickCircleIcon color="#28a745" size={16} />
          <Text marginLeft={8} size={300} fontWeight={500} data-testid="hostname">
            {row.hostname}
          </Text>
        </Table.Cell>
        {this.state.showRemainingTime && (
          <Table.Cell flex="none">
            <Text marginLeft={8} size={300} fontWeight={500} data-testid="remaining-time">
              {format(new Date(remainingTime), 'HH:mm:ss')}
            </Text>
          </Table.Cell>
        )}
      </Table.Row>
    );
  };

  render() {
    const items = this.filter(this.sort(this.state.list));

    return (
      <Pane padding={16} height="100%">
        <Table border height="100%">
          <Table.Head height={32} padding={0}>
            <Table.SearchHeaderCell
              onChange={this.handleFilterChange}
              value={this.state.searchQuery}
              placeholder={translate('filter') + '...'}
            />
            <Table.HeaderCell flex="none">
              {this.renderColumnSortButton({ orderedColumn: 1 })}
            </Table.HeaderCell>
            <Table.HeaderCell flex="none">
              {this.renderColumnTimeButton()}
            </Table.HeaderCell>
            <Table.HeaderCell width={48} flex="none">
              <Popover
                content={({ close }) => this.renderHeaderMenu({ close: close })}
                position={Position.BOTTOM_RIGHT}
                minWidth={160}
              >
                <IconButton
                  icon={MoreIcon}
                  height={24}
                  appearance="minimal"
                  data-testid="list-more-button"
                />
              </Popover>
            </Table.HeaderCell>
          </Table.Head>
          <Table.VirtualBody
            scrollToIndex={items.length > 0 ? this.state.scrollToIndex : undefined}
            height="calc(100% - 32px)"
          >
            {items.map((item) => this.renderRow({ row: item }))}
          </Table.VirtualBody>
        </Table>
      </Pane>
    );
  }
}
