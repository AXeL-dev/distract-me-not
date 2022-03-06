import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberInput } from 'components';

it('renders correctly', () => {
  const { asFragment } = render(<NumberInput value={5} />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles value change', () => {
  const handleChange = jest.fn();
  render(<NumberInput value={5} onChange={handleChange} />);
  const numberInput = screen.getByRole('spinbutton');
  fireEvent.change(numberInput, { target: { value: 10 } });
  expect(handleChange).toHaveBeenCalledTimes(1);
});
