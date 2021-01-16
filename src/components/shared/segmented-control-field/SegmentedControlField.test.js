import { render, fireEvent } from "@testing-library/react";
import SegmentedControlField from "./SegmentedControlField";

const options = [
  { label: 'Option 1', value: 'option-1' },
  { label: 'Option 2', value: 'option-2' },
  { label: 'Option 3', value: 'option-3' },
];

it('renders correctly', () => {
  const { asFragment } = render(<SegmentedControlField options={options} />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles selected option change', () => {
  const handleChange = jest.fn();
  const { getByRole } = render(<SegmentedControlField options={options} onChange={handleChange} />);
  const secondOption = getByRole('radio', { name: 'Option 2' });
  fireEvent.click(secondOption);
  expect(handleChange).toHaveBeenCalledTimes(1);
});
