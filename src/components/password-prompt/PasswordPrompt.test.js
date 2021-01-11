import { render, screen, fireEvent } from "@testing-library/react";
import PasswordPrompt from "./PasswordPrompt";

const password = {
  correct: 'test1234',
  wrong: 'pass1234'
};

it('renders password input', () => {
  render(<PasswordPrompt />);
  const input = screen.getByPlaceholderText('password');
  expect(input).toBeInTheDocument();
});

it('fails when password is wrong', () => {
  const handleSuccess = jest.fn();
  render(<PasswordPrompt onSuccess={handleSuccess} />);
  const input = screen.getByPlaceholderText('password');
  fireEvent.change(input, { target: { value: password.wrong } });
  //fireEvent.click(screen.getByRole('button'));
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(handleSuccess).not.toBeCalled();
});

it('succeeds when password is correct', () => {
  const handleSuccess = jest.fn();
  render(<PasswordPrompt onSuccess={handleSuccess} />);
  const input = screen.getByPlaceholderText('password');
  fireEvent.change(input, { target: { value: password.correct } });
  //fireEvent.click(screen.getByRole('button'));
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(handleSuccess).toBeCalled();
});
