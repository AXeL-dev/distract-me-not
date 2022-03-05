import React from 'react';
import { render, screen } from '@testing-library/react';
import App from 'App';

it('renders nothing when accessAllowed prop is not defined', () => {
  const { container } = render(<App />);
  expect(container.firstChild).toBeEmptyDOMElement();
});

it('renders appName header when access is allowed', () => {
  render(<App accessAllowed={true} />);
  const headerElement = screen.getByText(/appName/i);
  expect(headerElement).toBeInTheDocument();
});

it('renders password prompt when access is not allowed', () => {
  render(<App accessAllowed={false} />);
  const passwordInput = screen.getByPlaceholderText('password');
  expect(passwordInput).toBeInTheDocument();
});
