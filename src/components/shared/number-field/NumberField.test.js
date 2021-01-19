import { render, screen, fireEvent } from "@testing-library/react";
import { NumberField } from ".";

const input = {
  label: 'My number field',
  value: 5
};

it('renders correctly', () => {
  const { asFragment } = render(<NumberField label={input.label} value={input.value} />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles value change', () => {
  const handleChange = jest.fn();
  render(<NumberField label={input.label} value={input.value} onChange={handleChange} />);
  const numberInput = screen.getByRole('spinbutton');
  fireEvent.change(numberInput, { target: { value: 10 } });
  expect(handleChange).toHaveBeenCalledTimes(1);
});
