import { Component, Fragment } from 'react';
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
  DuplicateIcon,
  TrashIcon,
  ImportIcon,
  ExportIcon,
  TextDropdownButton
} from 'evergreen-ui';
import { capitalize } from '../../../helpers/string';
import { translate } from '../../../helpers/i18n';

const Order = {
  NONE: 'NONE',
  ASC: 'ASC',
  DESC: 'DESC'
};

export default class AdvancedTable extends Component {
  constructor(props) {
    super(props);

    const columns = props.columns || this.generateColumns(props.items); // [{ label: '' , value: '' }]

    this.state = {
      items: props.items || [],
      columns: columns,
      searchQuery: '',
      orderedColumn: 1,
      ordering: Order.NONE,
      filterColumn: props.filterColumn || columns[0].value,
      firstColumn: columns[0],
      column2Show: columns[1],
      lastColumn: columns.length > 1 ? columns[columns.length - 1] : null,
    };
  }

  generateColumns = (items) => {
    if (items && typeof items[0] === 'object') {
      return Object.keys(items[0]).sort().map(key => {
        return { label: capitalize(key), value: key };
      });
    } else {
      return [];
    }
  }

  getColumnByValue = (value) => {
    return this.state.columns.find(col => col.value === value) || this.state.columns[0];
  }

  sort = items => {
    const { ordering, orderedColumn } = this.state;
    // Return if there's no ordering.
    if (ordering === Order.NONE) return items;

    // Get the property to sort each item on.
    // By default use the `filterColumn` property.
    let propKey = this.state.filterColumn;
    // The second column is dynamic.
    if (orderedColumn === 2 && this.state.column2Show) propKey = this.state.column2Show.value;
    // The third column is fixed to the `lastColumn` property.
    if (orderedColumn === 3 && this.state.lastColumn) propKey = this.state.lastColumn.value;

    return items.sort((a, b) => {
      let aValue = a[propKey];
      let bValue = b[propKey];

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
      const result = filter([item[this.state.filterColumn]], searchQuery);
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

  renderValueTableHeaderCell = () => {
    return (
      <Table.HeaderCell>
        <Popover
          position={Position.BOTTOM_LEFT}
          content={({ close }) => (
            <Menu>
              <Menu.OptionsGroup
                title={translate('order')}
                options={[
                  { label: translate('ascending'), value: Order.ASC },
                  { label: translate('descending'), value: Order.DESC }
                ]}
                selected={
                  this.state.orderedColumn === 2 ? this.state.ordering : null
                }
                onChange={value => {
                  this.setState({
                    orderedColumn: 2,
                    ordering: value
                  })
                  // Close the popover when you select a value.
                  close()
                }}
              />

              {this.state.columns.length > 3 && this.state.column2Show &&
                <Fragment>
                  <Menu.Divider />

                  <Menu.OptionsGroup
                    title={translate('show')}
                    options={this.state.columns.slice(1, -1)}
                    selected={this.state.column2Show.value}
                    onChange={value => {
                      this.setState({
                        column2Show: this.getColumnByValue(value)
                      })
                      // Close the popover when you select a value.
                      close()
                    }}
                  />
                </Fragment>
              }
            </Menu>
          )}
        >
          <TextDropdownButton
            icon={
              this.state.orderedColumn === 2
                ? this.getIconForOrder(this.state.ordering)
                : CaretDownIcon
            }
          >
            {this.state.column2Show.label}
          </TextDropdownButton>
        </Popover>
      </Table.HeaderCell>
    )
  }

  renderColumnTableHeaderCell = ({ order, label }) => {
    return (
      <Table.TextHeaderCell>
        <Popover
          position={Position.BOTTOM_LEFT}
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
      </Table.TextHeaderCell>
    )
  }

  renderHeaderMenu = () => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item icon={ImportIcon}>{translate('import')}...</Menu.Item>
          <Menu.Item icon={ExportIcon}>{translate('export')}...</Menu.Item>
        </Menu.Group>
      </Menu>
    )
  }

  renderRowMenu = () => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item icon={EditIcon}>{translate('edit')}...</Menu.Item>
          <Menu.Item icon={ClipboardIcon}>{translate('copy')}...</Menu.Item>
          <Menu.Item icon={DuplicateIcon}>{translate('duplicate')}...</Menu.Item>
        </Menu.Group>
        <Menu.Divider />
        <Menu.Group>
          <Menu.Item icon={TrashIcon} intent="danger">{translate('delete')}...</Menu.Item>
        </Menu.Group>
      </Menu>
    )
  }

  renderRow = ({ row, key }) => {
    return (
      <Table.Row key={key}>
        <Table.Cell display="flex" alignItems="center">
          <Avatar name={row[this.state.firstColumn.value]} />
          <Text marginLeft={8} size={300} fontWeight={500}>
            {row[this.state.firstColumn.value]}
          </Text>
        </Table.Cell>
        {this.state.column2Show && <Table.TextCell>{row[this.state.column2Show.value]}</Table.TextCell>}
        {this.state.lastColumn && <Table.TextCell isNumber>{row[this.state.lastColumn.value]}</Table.TextCell>}
        <Table.Cell width={48} flex="none">
          <Popover
            content={this.renderRowMenu}
            position={Position.BOTTOM_RIGHT}
          >
            <IconButton icon={MoreIcon} height={24} appearance="minimal" />
          </Popover>
        </Table.Cell>
      </Table.Row>
    )
  }

  render() {
    const items = this.filter(this.sort(this.state.items));

    return (
      <Table border>
        <Table.Head>
          <Table.SearchHeaderCell
            onChange={this.handleFilterChange}
            value={this.state.searchQuery}
          />
          {this.state.column2Show && this.renderValueTableHeaderCell()}
          {this.state.lastColumn && this.renderColumnTableHeaderCell({ order: 3, label: this.state.lastColumn.label })}
          <Table.HeaderCell width={48} flex="none">
            <Popover
              content={this.renderHeaderMenu}
              position={Position.BOTTOM_RIGHT}
            >
              <IconButton icon={MoreIcon} height={24} appearance="minimal" />
            </Popover>
          </Table.HeaderCell>
        </Table.Head>
        <Table.VirtualBody height={240}>
          {items.map((item, index) => this.renderRow({ row: item, key: index }))}
        </Table.VirtualBody>
      </Table>
    )
  }
}
