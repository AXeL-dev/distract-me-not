import React from 'react';
import { render, screen } from '@testing-library/react';
import { Blocked } from 'components';

it('renders nothing when isBlank prop is true', () => {
  const { container } = render(<Blocked isBlank={true} />);
  expect(container).toBeEmptyDOMElement();
});

it('renders the provided text in the message prop', () => {
  render(<Blocked message="Hello world!" />);
  const message = screen.getByText('Hello world!', {
    selector: '.distract-overlay-top-text',
  });
  expect(message).toBeInTheDocument();
});

it('renders blocked link input when enabled', () => {
  render(<Blocked displayBlockedLink={true} />);
  const input = screen.getByRole('textbox');
  expect(input).toBeInTheDocument();
});

it('renders unblock button when enabled', () => {
  render(<Blocked hasUnblockButton={true} />);
  const button = screen.getByRole('button', {
    name: /unblock/i
  });
  expect(button).toBeInTheDocument();
});
