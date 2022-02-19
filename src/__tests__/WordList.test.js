import React from 'react';
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import * as fileHelper from "helpers/file";
import { WordList } from "components";
import copy from 'copy-to-clipboard';

const keywords = [
  'foo',
  'bar',
];

it('renders correctly', () => {
  const { container, asFragment } = render(<WordList list={keywords} />);
  for (let keyword of keywords) {
    expect(container).toHaveTextContent(keyword);
  }
  expect(asFragment()).toMatchSnapshot();
});

it('adds a keyword to list', () => {
  const keyword = 'test';
  const { container } = render(<WordList list={[]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // add keyword
  const addInput = screen.getByPlaceholderText('keywordExample', { selector: 'input[type="text"]' });
  fireEvent.change(addInput, { target: { value: keyword } });
  fireEvent.keyDown(addInput, { key: 'Enter' });
  // verify
  expect(list).toHaveTextContent(keyword);
});

it('edits a keyword', async () => {
  const keyword = {
    value: 'foo',
    replacement: 'bar'
  };
  const { container } = render(<WordList list={[keyword.value]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // click on more button
  const moreButton = screen.getByTestId('more-button');
  fireEvent.click(moreButton);
  // click on edit button
  const editButton = await waitFor(() => screen.getByRole('menuitem', { name: /edit/i }));
  fireEvent.click(editButton);
  // change keyword value
  const editDialog = await waitFor(() => screen.getByRole('dialog', { selector: '[data-state="entered"]' }));
  const editInput = within(editDialog).getByPlaceholderText('keywordExample');
  fireEvent.change(editInput, { target: { value: keyword.replacement } });
  // save
  const saveButton = screen.getByRole('button', { name: /edit/i });
  fireEvent.click(saveButton);
  // verify
  expect(list).toHaveTextContent(keyword.replacement);
});

it('deletes a keyword', async () => {
  const keyword = 'test';
  const { container } = render(<WordList list={[keyword]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // check if keyword is there
  expect(list).toHaveTextContent(keyword);
  // click on more button
  const moreButton = screen.getByTestId('more-button');
  fireEvent.click(moreButton);
  // click on delete button
  const deleteButton = await waitFor(() => screen.getByRole('menuitem', { name: /delete/i }));
  fireEvent.click(deleteButton);
  // verify
  expect(list).not.toHaveTextContent(keyword);
});

it('copies a keyword to clipboard', async () => {
  render(<WordList list={[keywords[0]]} />);
  // click on more button
  const moreButton = screen.getByTestId('more-button');
  fireEvent.click(moreButton);
  // click on copy button
  const copyButton = await waitFor(() => screen.getByRole('menuitem', { name: /copy/i }));
  fireEvent.click(copyButton);
  // verify
  expect(copy).toHaveBeenCalledTimes(1);
});

it('filters keywords', () => {
  const filter = keywords[0];
  const { container } = render(<WordList list={keywords} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // filter by keyword
  const filterInput = screen.getByPlaceholderText('filter...', { selector: 'input[type="text"]' });
  fireEvent.change(filterInput, { target: { value: filter } });
  // verify
  for (let keyword of keywords) {
    if (keyword === filter) continue;
    expect(list).not.toHaveTextContent(keyword);
  }
  expect(list).toHaveTextContent(filter);
});

it('sorts keywords in ascending order', async () => {
  const { container } = render(<WordList list={keywords} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // click on sort button
  const sortButton = screen.getByTestId('sort-button');
  fireEvent.click(sortButton);
  // choose asc order
  const ascButton = await waitFor(() => screen.getByRole('menuitemradio', { name: /ascending/i }));
  fireEvent.click(ascButton);
  // verify
  const listOrder = within(list).getAllByTestId('keyword').map(keyword => keyword.innerHTML);
  const expectedOrder = keywords.slice().sort((a, b) => a.localeCompare(b)); // asc
  expect(listOrder).toEqual(expectedOrder);
});

it('sorts keywords in descending order', async () => {
  const { container } = render(<WordList list={keywords} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // click on sort button
  const sortButton = screen.getByTestId('sort-button');
  fireEvent.click(sortButton);
  // choose desc order
  const descButton = await waitFor(() => screen.getByRole('menuitemradio', { name: /descending/i }));
  fireEvent.click(descButton);
  // verify
  const listOrder = within(list).getAllByTestId('keyword').map(keyword => keyword.innerHTML);
  const expectedOrder = keywords.slice().sort((a, b) => b.localeCompare(a)); // desc
  expect(listOrder).toEqual(expectedOrder);
});

it('imports keywords', async () => {
  const { container } = render(<WordList list={[]} />);
  const list = container.querySelector('div[data-evergreen-table-body="true"]');
  // trigger file input change event
  const fileInput = screen.getByTestId('file-input');
  const file = new File(keywords, 'blacklist.txt', { type: 'text/plain' });
  fireEvent.change(fileInput, { target: { files: [file] } });
  // verify
  for (let keyword of keywords) {
    await waitFor(() => expect(list).toHaveTextContent(keyword));
  }
});

it('exports keywords', async () => {
  const exportFilename = 'keywords.txt';
  render(<WordList list={keywords} exportFilename={exportFilename} />);
  // spy on file helper download function
  const downloadFn = jest.spyOn(fileHelper, 'download');
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
  expect(downloadFn).toHaveBeenCalledWith(
    {
      content: keywords,
      options: {
        type: 'text/plain'
      }
    }, 
    exportFilename
  );
});
