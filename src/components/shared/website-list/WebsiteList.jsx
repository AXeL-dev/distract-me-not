import { Component } from 'react';
import { filter } from 'fuzzaldrin-plus';
import {
  Table,
  Popover,
  Position,
  Menu,
  Avatar,
  Text,
  IconButton,
  ArrowUpIcon,
  ArrowDownIcon,
  CaretDownIcon,
  MoreIcon,
  EditIcon,
  ClipboardIcon,
  TrashIcon,
  ImportIcon,
  ExportIcon,
  TextDropdownButton
} from 'evergreen-ui';
import { translate } from '../../../helpers/i18n';
import { getHostName, getFaviconLink, checkFaviconLink } from '../../../helpers/url';
import './WebsiteList.scss';

const Order = {
  NONE: 'NONE',
  ASC: 'ASC',
  DESC: 'DESC'
};

export default class WebsiteList extends Component {

  constructor(props) {
    super(props);

    this.state = {
      list: props.list || [],
      favicons: {}, // { hostName: faviconUrl }
      searchQuery: '',
      orderedColumn: 1,
      ordering: Order.NONE,
    };

    // Get favicons by hostname
    for (let url of this.state.list) {
      const hostName = getHostName(url);
      if (this.state.favicons[hostName] !== undefined) {
        continue;
      } else {
        this.setState({
          favicons: {
            ...this.state.favicons,
            ...{ [hostName]: null }
          }
        });
      }
      const faviconLink = getFaviconLink(url);
      checkFaviconLink(faviconLink).then(result => {
        if (result) {
          this.setState({
            favicons: {
              ...this.state.favicons,
              ...{ [hostName]: faviconLink }
            }
          });
        }
      });
    }
  }

  sort = items => {
    const { ordering, orderedColumn } = this.state;
    // Return if there's no ordering.
    if (ordering === Order.NONE) return items;

    return items.sort((a, b) => {
      let aValue = a;
      let bValue = b;

      // Parse money as a number.
      const isMoney = aValue.indexOf('$') === 0;

      if (isMoney) {
        aValue = Number(aValue.slice(1));
        bValue = Number(bValue.slice(1));
      }

      // Support string comparison
      const sortTable = { true: 1, false: -1 };

      // Order ascending (Order.ASC)
      if (this.state.ordering === Order.ASC) {
        return aValue === bValue ? 0 : sortTable[aValue > bValue];
      }

      // Order descending (Order.DESC)
      return bValue === aValue ? 0 : sortTable[bValue > aValue];
    })
  }

  // Filter the items based on the name property.
  filter = items => {
    const searchQuery = this.state.searchQuery.trim();

    // If the searchQuery is empty, return the items as is.
    if (searchQuery.length === 0) return items;

    return items.filter(item => {
      // Use the filter from fuzzaldrin-plus to filter by filterColumn.
      const result = filter([item], searchQuery);
      return result.length === 1;
    })
  }

  getIconForOrder = order => {
    switch (order) {
      case Order.ASC:
        return ArrowUpIcon;
      case Order.DESC:
        return ArrowDownIcon;
      default:
        return CaretDownIcon;
    }
  }

  handleFilterChange = value => {
    this.setState({ searchQuery: value });
  }

  renderColumnSortButton = ({ order, label }) => {
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
                { label: translate('descending'), value: Order.DESC }
              ]}
              selected={
                this.state.orderedColumn === order ? this.state.ordering : null
              }
              onChange={value => {
                this.setState({
                  orderedColumn: order,
                  ordering: value
                })
                // Close the popover when you select a value.
                close()
              }}
            />
          </Menu>
        )}
      >
        <TextDropdownButton
          icon={
            this.state.orderedColumn === order
              ? this.getIconForOrder(this.state.ordering)
              : CaretDownIcon
          }
        >
          {label}
        </TextDropdownButton>
      </Popover>
    )
  }

  renderColumnTableHeaderCell = ({ order, label }) => {
    return (
      <Table.TextHeaderCell>
        {this.renderColumnSortButton({ order: order, label: label })}
      </Table.TextHeaderCell>
    )
  }

  renderHeaderMenu = () => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item icon={ExportIcon}>{translate('export')}</Menu.Item>
          <Menu.Item icon={ImportIcon}>{translate('import')}</Menu.Item>
        </Menu.Group>
      </Menu>
    )
  }

  renderRowMenu = () => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item icon={EditIcon}>{translate('edit')}</Menu.Item>
          <Menu.Item icon={ClipboardIcon}>{translate('copy')}</Menu.Item>
        </Menu.Group>
        <Menu.Divider />
        <Menu.Group>
          <Menu.Item icon={TrashIcon} intent="danger">{translate('delete')}</Menu.Item>
        </Menu.Group>
      </Menu>
    )
  }

  renderRow = ({ row, index }) => {
    const hostName = getHostName(row);

    return (
      <Table.Row key={index}>
        <Table.Cell display="flex" alignItems="center">
          {this.state.favicons[hostName] ? (
            <Avatar
              src={this.state.favicons[hostName]}
              name={hostName}
              size={16}
              margin={4}
              borderRadius={0}
              backgroundColor="inherit"
            />
          ) : (
            <Avatar
              name={hostName}
              size={24}
            />
          )}
          <Text marginLeft={8} size={300} fontWeight={500}>
            {row}
          </Text>
        </Table.Cell>
        <Table.Cell width={48} flex="none">
          <Popover
            content={this.renderRowMenu}
            position={Position.BOTTOM_RIGHT}
            minWidth={160}
          >
            <IconButton icon={MoreIcon} height={24} appearance="minimal" />
          </Popover>
        </Table.Cell>
      </Table.Row>
    )
  }

  render() {
    const items = this.filter(this.sort(this.state.list));

    return (
      <Table border>
        <Table.Head>
          <Table.SearchHeaderCell
            onChange={this.handleFilterChange}
            value={this.state.searchQuery}
          />
          <Table.HeaderCell flex="none">
            {this.renderColumnSortButton({ order: 1 })}
          </Table.HeaderCell>
          <Table.HeaderCell width={48} flex="none">
            <Popover
              content={this.renderHeaderMenu}
              position={Position.BOTTOM_RIGHT}
              minWidth={160}
            >
              <IconButton icon={MoreIcon} height={24} appearance="minimal" />
            </Popover>
          </Table.HeaderCell>
        </Table.Head>
        <Table.VirtualBody height={240}>
          {items.map((item, index) => this.renderRow({ row: item, index: index }))}
        </Table.VirtualBody>
      </Table>
    )
  }
}
