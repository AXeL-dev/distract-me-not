import { render, screen, fireEvent } from "@testing-library/react";
import { MultiSelectField } from ".";

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
  render(<MultiSelectField label="My field" options={options} onChange={handleChange} />);
  const selectMenu = screen.getByRole('button');
  fireEvent.click(selectMenu);
  // check if all options are visible
  for (let option of options) {
    expect(screen.getByText(option.label)).toBeInTheDocument();
  }
  // select 2nd option
  fireEvent.click(screen.getByText(options[2].label));
  expect(handleChange).toHaveBeenCalledTimes(1);
  expect(selectMenu).toHaveTextContent(options[2].label);
});
