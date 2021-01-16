import { render, fireEvent } from "@testing-library/react";
import MultiSelectField from "./MultiSelectField";

const options = [
  { label: 'Option 1', value: 'option-1' },
  { label: 'Option 2', value: 'option-2' },
  { label: 'Option 3', value: 'option-3' },
];

it('renders correctly', () => {
  const { asFragment } = render(<MultiSelectField label="My field" options={options} />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles selection change', () => {
  const handleChange = jest.fn();
  const { getByRole, getByText } = render(<MultiSelectField label="My field" options={options} onChange={handleChange} />);
  const selectMenu = getByRole('button');
  fireEvent.click(selectMenu);
  // check if all options are visible
  for (let option of options) {
    expect(getByText(option.label)).toBeInTheDocument();
  }
  // select 2nd option
  fireEvent.click(getByText(options[2].label));
  expect(handleChange).toHaveBeenCalledTimes(1);
  expect(selectMenu).toHaveTextContent(options[2].label);
});
