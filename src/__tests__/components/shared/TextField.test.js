import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextField } from 'components';

it('renders correctly', () => {
  const { asFragment } = render(<TextField />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles value change', () => {
  const handleChange = jest.fn();
  render(<TextField value="some text" onChange={handleChange} />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'some other text' } });
  expect(handleChange).toHaveBeenCalledTimes(1);
});

it('handles submit using both enter key press & button click', () => {
  const handleSubmit = jest.fn();
  render(<TextField hasButton onSubmit={handleSubmit} />);
  const input = screen.getByRole('textbox');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(handleSubmit).toHaveBeenCalledTimes(1);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(handleSubmit).toHaveBeenCalledTimes(2);
});
