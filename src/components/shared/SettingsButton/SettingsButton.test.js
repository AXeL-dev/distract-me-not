import { render } from "@testing-library/react";
import { SettingsButton } from ".";

it('renders correctly', () => {
  const { asFragment } = render(<SettingsButton />);
  expect(asFragment()).toMatchSnapshot();
});
