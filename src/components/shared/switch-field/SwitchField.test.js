import { render, fireEvent } from "@testing-library/react";
import SwitchField from "./SwitchField";

it('renders correctly', () => {
  const { asFragment } = render(<SwitchField />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles value change', () => {
  const handleChange = jest.fn();
  const { getByRole } = render(<SwitchField checked={false} onChange={handleChange} />);
  const _switch = getByRole('checkbox');
  expect(_switch.checked).toBe(false);
  fireEvent.click(_switch);
  expect(handleChange).toHaveBeenCalledTimes(1);
  //expect(_switch.checked).toBe(true); // will not fire since we are not updating the checked prop state
});
