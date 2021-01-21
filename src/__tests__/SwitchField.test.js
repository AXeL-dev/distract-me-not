import { render, screen, fireEvent } from "@testing-library/react";
import { SwitchField } from "../components";

it('renders correctly', () => {
  const { asFragment } = render(<SwitchField />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles value change', () => {
  const handleChange = jest.fn();
  render(<SwitchField checked={false} onChange={handleChange} />);
  const _switch = screen.getByRole('checkbox');
  expect(_switch.checked).toBe(false);
  fireEvent.click(_switch);
  expect(handleChange).toHaveBeenCalledTimes(1);
  //expect(_switch.checked).toBe(true); // will not fire since we are not updating the checked prop state
});
