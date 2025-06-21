import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Panel } from 'components';

// Mock Chrome storage with default values
const mockStorageData = {
  isEnabled: true,
  mode: 'denylist',
  denyList: [],
  allowList: [],
  unblock: {
    isEnabled: false,
  },
  logs: {
    isEnabled: false,
  },
  timer: {
    isEnabled: false,
  },
  schedule: {
    isEnabled: false,
    days: {},
  },
  hideReportIssueButton: false,
  showAddWebsitePrompt: false,
};

beforeEach(() => {
  // Reset Chrome storage mocks
  global.chrome.storage.local.get.mockResolvedValue(mockStorageData);
  global.chrome.storage.sync.get.mockResolvedValue({});
});

it('renders panel correctly', () => {
  const { container, asFragment } = render(<Panel />);
  const status = screen.getByText(/status/i);
  const mode = screen.getByText(/mode/i);
  expect(container).not.toBeEmptyDOMElement();
  expect(status).toBeInTheDocument();
  expect(mode).toBeInTheDocument();
  expect(asFragment()).toMatchSnapshot();
});

it('updates status when toggled', () => {
  render(<Panel />);
  const statusSwitch = screen.getByRole('checkbox');
  const oldStatus = statusSwitch.checked;
  fireEvent.click(statusSwitch);
  expect(statusSwitch.checked).toBe(!oldStatus);
});

it('updates mode when changed to allow list', () => {
  render(<Panel />);
  const allowListMode = screen.getByText(/allowList/i);
  fireEvent.click(allowListMode);
  const allowListButton = screen.getByRole('button', {
    name: 'allowList',
  });
  expect(allowListButton.getAttribute('data-checked')).toEqual('true');
});

it('updates mode when changed to deny list', () => {
  render(<Panel />);
  const denyListMode = screen.getByText(/denyList/i);
  fireEvent.click(denyListMode);
  const denyListButton = screen.getByRole('button', {
    name: 'denyList',
  });
  expect(denyListButton.getAttribute('data-checked')).toEqual('true');
});
