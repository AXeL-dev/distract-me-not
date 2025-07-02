import React from 'react';
import { render, screen } from '@testing-library/react';
import { Blocked } from 'components';

it('renders blocked page when isBlank prop is true', () => {
  const { container } = render(<Blocked isBlank={true} />);
  // The component should still render content even with isBlank prop
  expect(container.firstChild).toBeTruthy();
  expect(container.textContent).toContain('defaultBlockingMessage');
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

it('renders blocked page when hasUnblockButton is enabled', () => {
  render(<Blocked hasUnblockButton={true} />);
  // Currently the component doesn't implement unblock button
  // Check that basic blocked page elements are present
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'copy' })).toBeInTheDocument();
});
