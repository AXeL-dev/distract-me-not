import { render } from "@testing-library/react";
import { Header } from ".";

it('renders correctly', () => {
  const { asFragment } = render(<Header />);
  expect(asFragment()).toMatchSnapshot();
});
