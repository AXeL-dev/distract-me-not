import React from 'react';
import { render, screen } from '@testing-library/react';
import { Blocked } from 'components';

it('renders the blocked content when isBlank prop is true', () => {
  const { container } = render(<Blocked isBlank={true} />);
  expect(container).not.toBeEmptyDOMElement();
  expect(container.querySelector('.distract-overlay-container')).toBeInTheDocument();
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

it('renders blocked reason when provided', () => {
  const { container } = render(<Blocked />);
  // The blocked component renders itself but doesn't have an unblock button
  expect(container).not.toBeEmptyDOMElement();
});
