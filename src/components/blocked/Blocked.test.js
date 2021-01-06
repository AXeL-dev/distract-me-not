import { render, screen } from "@testing-library/react";
import Blocked from "./Blocked";

it('renders a blank page when isBlank prop is true', () => {
  const { container } = render(<Blocked isBlank={true} />);
  expect(container).toBeEmptyDOMElement();
});

it('renders the provided message prop', () => {
  const { getByText } = render(<Blocked message="Hello world!" />);
  const message = getByText('Hello world!', { selector: '.distract-overlay-top-text' });
  expect(message).toBeInTheDocument();
});
