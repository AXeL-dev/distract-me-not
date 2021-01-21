import { render } from "@testing-library/react";
import { Header } from "../components";

it('renders correctly', () => {
  const { asFragment } = render(<Header />);
  expect(asFragment()).toMatchSnapshot();
});
