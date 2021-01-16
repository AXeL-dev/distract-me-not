import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { defaultBlacklist } from "../../../helpers/block";
import * as fileHelper from "../../../helpers/file";
import WebsiteList from "./WebsiteList";

it('renders correctly', () => {
  const { container, asFragment } = render(<WebsiteList list={defaultBlacklist} />);
  for (let url of defaultBlacklist) {
    expect(container).toHaveTextContent(url);
  }
  expect(asFragment()).toMatchSnapshot();
});

it('adds a url to list', () => {
  const url = 'www.google.com';
  const { container } = render(<WebsiteList list={[]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // add url
  const addInput = screen.getByPlaceholderText('urlExample', { selector: 'input[type="text"]' });
  fireEvent.change(addInput, { target: { value: url } });
  fireEvent.keyDown(addInput, { key: 'Enter' });
  // verify
  expect(list).toHaveTextContent(url);
});

it('edits a url', async () => {
  const url = {
    value: 'www.google.com',
    replacement: 'www.bing.com'
  };
  const { container } = render(<WebsiteList list={[url.value]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // click on more button
  const moreButton = screen.getByTestId('more-button');
  fireEvent.click(moreButton);
  // click on edit button
  const editButton = await waitFor(() => screen.getByRole('menuitem', { name: /edit/i }));
  fireEvent.click(editButton);
  // change url value
  const editDialog = await waitFor(() => screen.getByRole('dialog', { selector: '[data-state="entered"]' }));
  const editInput = within(editDialog).getByPlaceholderText('urlExample');
  fireEvent.change(editInput, { target: { value: url.replacement } });
  // save
  const saveButton = screen.getByRole('button', { name: /edit/i });
  fireEvent.click(saveButton);
  // verify
  expect(list).toHaveTextContent(url.replacement);
});

it('deletes a url', async () => {
  const url = 'www.google.com';
  const { container } = render(<WebsiteList list={[url]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // check if url is there
  expect(list).toHaveTextContent(url);
  // click on more button
  const moreButton = screen.getByTestId('more-button');
  fireEvent.click(moreButton);
  // click on delete button
  const deleteButton = await waitFor(() => screen.getByRole('menuitem', { name: /delete/i }));
  fireEvent.click(deleteButton);
  // verify
  expect(list).not.toHaveTextContent(url);
});

it('copies a url to clipboard', async () => {
  render(<WebsiteList list={[defaultBlacklist[0]]} />);
  // mock clipboard handler
  document.execCommand = jest.fn();
  // click on more button
  const moreButton = screen.getByTestId('more-button');
  fireEvent.click(moreButton);
  // click on copy button
  const copyButton = await waitFor(() => screen.getByRole('menuitem', { name: /copy/i }));
  fireEvent.click(copyButton);
  // verify
  expect(document.execCommand).toHaveBeenCalledWith('copy');
});

it('filters urls', () => {
  const filter = defaultBlacklist[0];
  const { container } = render(<WebsiteList list={defaultBlacklist} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // filter by url
  const filterInput = screen.getByPlaceholderText('filter...', { selector: 'input[type="text"]' });
  fireEvent.change(filterInput, { target: { value: filter } });
  // verify
  for (let url of defaultBlacklist) {
    if (url === filter) continue;
    expect(list).not.toHaveTextContent(url);
  }
  expect(list).toHaveTextContent(filter);
});

it('sorts urls in descending order', async () => {
  const { container } = render(<WebsiteList list={defaultBlacklist} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // click on sort button
  const sortButton = screen.getByTestId('sort-button');
  fireEvent.click(sortButton);
  // choose desc order
  const descButton = await waitFor(() => screen.getByRole('menuitemradio', { name: /descending/i }));
  fireEvent.click(descButton);
  // verify
  const listOrder = within(list).getAllByTestId('url').map(url => url.innerHTML);
  const expectedOrder = defaultBlacklist.slice().sort((a, b) => b.localeCompare(a)); // desc
  expect(listOrder).toEqual(expectedOrder);
});

it('imports urls', async () => {
  const { container } = render(<WebsiteList list={[]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // trigger file input change event
  const fileInput = screen.getByTestId('file-input');
  const file = new File(defaultBlacklist, 'blacklist.txt', { type: 'text/plain' });
  fireEvent.change(fileInput, { target: { files: [file] } });
  // verify
  for (let url of defaultBlacklist) {
    await waitFor(() => expect(list).toHaveTextContent(url));
  }
});

it('exports urls', async () => {
  const exportFilename = 'blacklist.txt';
  render(<WebsiteList list={defaultBlacklist} exportFilename={exportFilename} />);
  // spy on file helper download function
  jest.spyOn(fileHelper, 'download');
  global.URL.createObjectURL = jest.fn(); // fix error: URL.createObjectURL is not a function
  global.Blob = function(content, options) { // allow us to compare Blobs
    return {
      content: content[0].split("\n"),
      options
    };
  };
  // click on more button
  const moreButton = screen.getByTestId('list-more-button');
  fireEvent.click(moreButton);
  // click on export button
  const exportButton = await waitFor(() => screen.getByRole('menuitem', { name: /export/i }));
  fireEvent.click(exportButton);
  // verify
  expect(fileHelper.download).toHaveBeenCalledWith(
    {
      content: defaultBlacklist,
      options: {
        type: 'text/plain'
      }
    }, 
    exportFilename
  );
});
