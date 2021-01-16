import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { defaultBlacklist } from "../../../helpers/block";
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

it('filters urls', async () => {
  const filter = defaultBlacklist[0];
  const { container } = render(<WebsiteList list={defaultBlacklist} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // filter by url
  const filterInput = screen.getByPlaceholderText('filter...', { selector: 'input[type="text"]' });
  fireEvent.change(filterInput, { target: { value: filter } });
  // verify
  for (let url in defaultBlacklist) {
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
  const expectedOrder = defaultBlacklist.slice().sort((a, b) => b.localeCompare(a)); // desc
  const listOrder = within(list).getAllByTestId('url').map(url => url.innerHTML);
  expect(listOrder).toEqual(expectedOrder);
});
