import { render, fireEvent, waitFor } from "@testing-library/react";
import { CrossIcon } from "evergreen-ui";
import AnimatedIconButton from "./AnimatedIconButton";

it('renders correctly', () => {
  const { asFragment } = render(<AnimatedIconButton icon={CrossIcon} />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles click', () => {
  const handleClick = jest.fn();
  const { container } = render(<AnimatedIconButton icon={CrossIcon} onClick={handleClick} />);
  fireEvent.click(container.firstChild);
  expect(handleClick).toHaveBeenCalledTimes(1);
});

it('hides on click when hideOnClick prop is set', async () => {
  const { container, getByRole } = render(<AnimatedIconButton icon={CrossIcon} hideOnClick={true} />);
  const button = getByRole('button'); // or container.firstChild (but it will not work once the button get removed after click)
  fireEvent.click(button);
  await waitFor(() => expect(button).not.toBeInTheDocument(), { timeout: 2000 });
});
