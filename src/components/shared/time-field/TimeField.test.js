import { render, fireEvent } from "@testing-library/react";
import TimeField from "./TimeField";

it('renders correctly', () => {
  const { asFragment } = render(<TimeField label="time" />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles value change', () => {
  const handleChange = jest.fn();
  const { container } = render(<TimeField label="time" value="12:00" onChange={handleChange} />);
  const input = container.querySelector('input[type="time"]');
  fireEvent.change(input, { target: { value: '13:00' } });
  expect(handleChange).toHaveBeenCalledTimes(1);
});
