import React from 'react';
import { render, screen, fireEvent } from "@testing-library/react";
import { Panel } from "components";

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

it('updates mode when changed to whitelist', () => {
  render(<Panel />);
  const whitelistMode = screen.getByText(/whitelist/i);
  fireEvent.click(whitelistMode);
  const whitelistButton = screen.getByRole('button', { name: 'whitelist' });
  expect(whitelistButton.getAttribute('data-checked')).toEqual('true');
});

it('updates mode when changed to blacklist', () => {
  render(<Panel />);
  const blacklistMode = screen.getByText(/blacklist/i);
  fireEvent.click(blacklistMode);
  const blacklistButton = screen.getByRole('button', { name: 'blacklist' });
  expect(blacklistButton.getAttribute('data-checked')).toEqual('true');
});
