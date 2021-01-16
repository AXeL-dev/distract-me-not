import { render, fireEvent } from "@testing-library/react";
import NumberField from "./NumberField";

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
  const { getByRole } = render(<NumberField label={input.label} value={input.value} onChange={handleChange} />);
  const numberInput = getByRole('spinbutton');
  fireEvent.change(numberInput, { target: { value: 10 } });
  expect(handleChange).toHaveBeenCalledTimes(1);
});
