import React, { Component, Fragment } from 'react';
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
  TextDropdownButton,
  toaster,
  Dialog,
} from 'evergreen-ui';
import copy from 'copy-to-clipboard';
import { TextField } from 'components';
import { translate } from 'helpers/i18n';
import { debug } from 'helpers/debug';
import { download, readFile } from 'helpers/file';
import { getHostname, getFaviconLink, checkFaviconLink, isUrl } from 'helpers/url';
import './styles.scss';

const Order = {
  NONE: 'NONE',
  ASC: 'ASC',
  DESC: 'DESC',
};

export class WebsiteList extends Component {
  constructor(props) {
    super(props);
    this.importFileInputRef = React.createRef();
    this.state = {
      list: this.getOrderedList(props.list), // [{ id, url }]
      favicons: {}, // { hostName: faviconUrl }
      searchQuery: '',
      orderedColumn: 1,
      ordering: Order.NONE,
      editDialog: {
        isShown: false,
        row: null,
        value: '',
      },
    };
  }

  componentDidMount() {
    for (let item of this.state.list) {
      this.getFavicon(item.url);
    }
  }

  getOrderedList = (list) => {
    return list ? list.map((url, index) => ({ id: index + 1, url: url })) : [];
  };

  setList = (list) => {
    // used to update list from parent component
    // Update state
    this.setState({ list: this.getOrderedList(list) });
    // Get new favicons
    for (let url of list) {
      this.getFavicon(url);
    }
  };

  getFavicon = (url) => {
    // Get favicon by hostname
    const hostName = getHostname(url);
    if (this.state.favicons[hostName] !== undefined) {
      return;
    } else {
      this.setState({
        favicons: {
          ...this.state.favicons,
          ...{ [hostName]: null },
        },
      });
    }
    const faviconLink = getFaviconLink(url);
    checkFaviconLink(faviconLink).then((result) => {
      if (result) {
        debug.log('favicon:', faviconLink);
        this.setState({
          favicons: {
            ...this.state.favicons,
            ...{ [hostName]: faviconLink },
          },
        });
      }
    });
  };

  sort = (items) => {
    const { ordering } = this.state;
    // Return if there's no ordering.
    if (ordering === Order.NONE) return items;

    // Get the property to sort each item on.
    // By default use the `url` property.
    let propKey = 'url';

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
      // Use the filter from fuzzaldrin-plus to filter by url.
      const result = filter([item.url], searchQuery);
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

  addToList = (url, setTextFieldValue) => {
    debug.log('add to list:', url);
    if (!isUrl(url)) {
      toaster.danger(translate('urlIsNotValid'), {
        id: 'settings-toaster',
      });
    } else if (this.state.list.find((item) => item.url === url)) {
      toaster.danger(translate('urlAlreadyExists'), {
        id: 'settings-toaster',
      });
    } else {
      // Add url
      const list = [...this.state.list];
      const newItem = { id: list.length + 1, url: url };
      if (this.props.addNewItemsOnTop) {
        list.splice(0, 0, newItem);
      } else {
        list.push(newItem);
      }
      this.setState({ list: list });
      // Get favicon
      this.getFavicon(url);
      // Empty text field
      setTextFieldValue('');
      // Submit changes
      this.submitChanges(list);
    }
  };

  submitChanges = (list, map = true) => {
    // Call onChange prop
    if (this.props.onChange) {
      this.props.onChange(map ? list.map((item) => item.url) : list);
    }
  };

  delete = (row) => {
    debug.log('delete:', row);
    // Remove item
    const list = this.state.list.filter((item) => item.id !== row.id);
    this.setState({ list: list });
    // Submit changes
    this.submitChanges(list);
  };

  edit = ({ row, value }) => {
    debug.log('edit:', { row: row, value: value });
    if (!isUrl(value)) {
      toaster.danger(translate('urlIsNotValid'), {
        id: 'settings-toaster',
      });
    } else if (this.state.list.find((item) => item.url === value && item.id !== row.id)) {
      toaster.danger(translate('urlAlreadyExists'), {
        id: 'settings-toaster',
      });
    } else {
      // Edit url
      const list = this.state.list.map((item) =>
        item.id === row.id ? { id: item.id, url: value } : item
      );
      this.setState({ list: list });
      // Get favicon
      this.getFavicon(value);
      // Close edit dialog
      this.closeEditDialog();
      // Submit changes
      this.submitChanges(list);
    }
  };

  openEditDialog = (row) => {
    this.setState({
      editDialog: {
        row: row,
        value: row.url,
        isShown: true,
      },
    });
  };

  closeEditDialog = () => {
    this.setState({
      editDialog: {
        ...this.state.editDialog,
        isShown: false,
      },
    });
  };

  copyToClipboard = (text) => {
    if (copy(text)) {
      toaster.success(translate('copiedToClipboard'), {
        id: 'settings-toaster',
      });
    }
  };

  export = () => {
    const list = this.state.list.map((item) => item.url),
      blob = new Blob([list.join('\n')], { type: 'text/plain' });
    download(blob, this.props.exportFilename || 'export.txt');
  };

  import = (file) => {
    readFile(file).then((content) => {
      const list =
        content && content.length ? content.split('\n').filter((url) => isUrl(url)) : [];
      if (list.length) {
        // Update list
        this.setList(list);
        // Submit changes
        this.submitChanges(list, false);
      }
    });
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

  renderHeaderMenu = ({ close }) => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item
            icon={ExportIcon}
            onSelect={() => {
              this.export();
              close();
            }}
          >
            {translate('export')}
          </Menu.Item>
          <Menu.Item
            icon={ImportIcon}
            onSelect={() => {
              this.importFileInputRef.current.click();
              close();
            }}
          >
            {translate('import')}
          </Menu.Item>
        </Menu.Group>
      </Menu>
    );
  };

  renderRowMenu = ({ row, close }) => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item
            icon={EditIcon}
            onSelect={() => {
              this.openEditDialog(row);
              close();
            }}
          >
            {translate('edit')}
          </Menu.Item>
          <Menu.Item
            icon={ClipboardIcon}
            onSelect={() => {
              this.copyToClipboard(row.url);
              close();
            }}
          >
            {translate('copy')}
          </Menu.Item>
        </Menu.Group>
        <Menu.Divider />
        <Menu.Group>
          <Menu.Item
            icon={TrashIcon}
            intent="danger"
            onSelect={() => {
              this.delete(row);
              close();
            }}
          >
            {translate('delete')}
          </Menu.Item>
        </Menu.Group>
      </Menu>
    );
  };

  renderRow = ({ row }) => {
    const hostName = getHostname(row.url);

    return (
      <Table.Row key={row.id}>
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
            <Avatar name={hostName} size={24} />
          )}
          <Text marginLeft={8} size={300} fontWeight={500} data-testid="url">
            {row.url}
          </Text>
        </Table.Cell>
        <Table.Cell width={48} flex="none">
          <Popover
            content={({ close }) => this.renderRowMenu({ row: row, close: close })}
            position={Position.BOTTOM_RIGHT}
            minWidth={160}
          >
            <IconButton
              icon={MoreIcon}
              height={24}
              appearance="minimal"
              data-testid="more-button"
            />
          </Popover>
        </Table.Cell>
      </Table.Row>
    );
  };

  render() {
    const items = this.filter(this.sort(this.state.list));

    return (
      <Fragment>
        <Table border>
          <Table.Head height={32} padding={0}>
            <Table.SearchHeaderCell
              onChange={this.handleFilterChange}
              value={this.state.searchQuery}
              placeholder={translate('filter') + '...'}
            />
            <Table.HeaderCell flex="none">
              {this.renderColumnSortButton({ orderedColumn: 1 })}
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
          <Table.VirtualBody height={240}>
            {items.map((item) => this.renderRow({ row: item }))}
          </Table.VirtualBody>
        </Table>
        <TextField
          placeholder={translate('urlExample')}
          hint={translate('addWebsiteHint')}
          hasButton={true}
          buttonLabel={translate('add')}
          onSubmit={this.addToList}
          marginTop={16}
          required
        />
        <Dialog
          isShown={this.state.editDialog.isShown}
          onCloseComplete={() => this.closeEditDialog()}
          cancelLabel={translate('cancel')}
          confirmLabel={translate('edit')}
          onConfirm={() =>
            this.edit({
              row: this.state.editDialog.row,
              value: this.state.editDialog.value,
            })
          }
          hasHeader={false}
          shouldCloseOnOverlayClick={false}
          topOffset="24vmin"
          minHeightContent="auto"
          contentContainerProps={{ padding: 16 }}
          containerProps={{ className: 'edit-dialog' }}
        >
          <TextField
            placeholder={translate('urlExample')}
            hint={translate('addWebsiteHint')}
            value={this.state.editDialog.value}
            onChange={(event) =>
              this.setState({
                editDialog: {
                  ...this.state.editDialog,
                  value: event.target.value,
                },
              })
            }
          />
        </Dialog>
        {/* Keep file input here to be sure that it will not be removed from the dom on popover close for example */}
        <input
          ref={this.importFileInputRef}
          type="file"
          className="hidden"
          accept=".txt"
          onClick={(event) => (event.target.value = '')}
          onChange={(event) => {
            const file = event.target.files[0];
            this.import(file);
          }}
          data-testid="file-input"
        />
      </Fragment>
    );
  }
}
