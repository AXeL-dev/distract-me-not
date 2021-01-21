import { render, screen } from "@testing-library/react";
import { TooltipLabel } from "../components";

it('renders correctly', () => {
  const text = 'some text';
  const { asFragment } = render(<TooltipLabel text={text} />);
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(asFragment()).toMatchSnapshot();
});

it('renders correctly when tooltip prop is set', () => {
  const { asFragment } = render(<TooltipLabel text="some text" tooltip="this is a tooltip" />);
  expect(asFragment()).toMatchSnapshot();
});
