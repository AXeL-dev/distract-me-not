import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
//import { toaster } from 'evergreen-ui';
import { Settings } from 'components';

it('renders all tabs', () => {
  render(<Settings />);
  const blocking = screen.getByRole('tab', { name: /^blocking/i });
  const unblocking = screen.getByRole('tab', {
    name: /^unblocking/i,
  });
  const schedule = screen.getByRole('tab', { name: /^schedule/i });
  const blacklist = screen.getByRole('tab', { name: /^blacklist/i });
  const whitelist = screen.getByRole('tab', { name: /^whitelist/i });
  const password = screen.getByRole('tab', { name: /^password/i });
  const timer = screen.getByRole('tab', { name: /^timer/i });
  const logs = screen.getByRole('tab', { name: /^logs/i });
  const miscellaneous = screen.getByRole('tab', {
    name: /^miscellaneous/i,
  });
  const about = screen.getByRole('tab', { name: /^about/i });
  expect(blocking).toBeInTheDocument();
  expect(unblocking).toBeInTheDocument();
  expect(schedule).toBeInTheDocument();
  expect(blacklist).toBeInTheDocument();
  expect(whitelist).toBeInTheDocument();
  expect(password).toBeInTheDocument();
  expect(timer).toBeInTheDocument();
  expect(logs).toBeInTheDocument();
  expect(miscellaneous).toBeInTheDocument();
  expect(about).toBeInTheDocument();
});

it('renders save button', () => {
  render(<Settings />);
  const saveButton = screen.getByRole('button', { name: 'save' });
  expect(saveButton).toBeInTheDocument();
});

it('saves settings on save button click', async () => {
  //const toasterSuccess = jest.spyOn(toaster, 'success');
  render(<Settings />);
  const saveButton = screen.getByRole('button', { name: 'save' });
  fireEvent.click(saveButton);
  const saveSuccessText = await waitFor(() => screen.getByText(/settingsSaved/i));
  expect(saveSuccessText).toBeInTheDocument();
  //expect(toasterSuccess).toBeCalled();
});

it('accepts only passwords that contains at least 8 characters', async () => {
  const passwords = [],
    minCharsNumber = 8;
  // fill passwords array with generic strings having length from 0 to 8
  for (let i = 0; i <= minCharsNumber; i++) {
    passwords.push(Array(i + 1).join('p'));
  }
  // render our component
  const { container } = render(<Settings enablePassword={true} />);
  const passwordInput = container.querySelector('input[type="password"]'); // screen.getByTestId('password');
  const saveButton = screen.getByRole('button', { name: 'save' });
  // test passwords containing less than 8 characters
  for (let i = 0; i < minCharsNumber; i++) {
    fireEvent.change(passwordInput, {
      target: { value: passwords[i] },
    });
    fireEvent.click(saveButton);
    const passwordErrorText = await waitFor(() => screen.getByText(/passwordIsShort/i));
    expect(passwordErrorText).toBeInTheDocument();
  }
  // test correct password (having 8 chars)
  fireEvent.change(passwordInput, {
    target: { value: passwords[minCharsNumber] },
  });
  fireEvent.click(saveButton);
  const saveSuccessText = await waitFor(() => screen.getByText(/settingsSaved/i));
  expect(saveSuccessText).toBeInTheDocument();
}, 30000);
